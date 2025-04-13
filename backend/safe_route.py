from flask import Flask, request, jsonify
import joblib
import numpy as np
import openrouteservice as ors
from openrouteservice.directions import directions
import polyline
import pandas as pd
from sklearn.cluster import DBSCAN
from collections import defaultdict
import requests
import os

app = Flask(__name__)

# Configuration
ORS_API_KEY = "<>"
OPENCELLID_API_KEY = "<>"
OPENCELLID_BASE_URL = "https://opencellid.org"
TASMAC_CSV_PATH = "tasmac_locations.csv"  # Path to your CSV file

# Load models and data
predictor = joblib.load("risk_model.pkl")
gmm = predictor['gmm']
scaler = predictor['scaler']
ors_client = ors.Client(key=ORS_API_KEY)

def load_tasmac_locations():
    """Load TASMAC locations from CSV file"""
    try:
        if not os.path.exists(TASMAC_CSV_PATH):
            print(f"TASMAC CSV file not found at {TASMAC_CSV_PATH}")
            return []
            
        df = pd.read_csv(TASMAC_CSV_PATH)
        tasmac_locations = []
        
        for _, row in df.iterrows():
            tasmac_locations.append({
                'lat': row['Latitude'],
                'lng': row['Longitude'],
                'name': row['Location Name'],
                'address': row['Address']
            })
        
        return tasmac_locations
    except Exception as e:
        print(f"Error loading TASMAC locations: {e}")
        return []

# Load TASMAC data at startup
tasmac_locations = load_tasmac_locations()

def get_cell_towers_in_area(bbox):
    """Fetch cell towers in a bounding box from OpenCellID"""
    try:
        url = f"{OPENCELLID_BASE_URL}/cell/getInArea"
        params = {
            'key': OPENCELLID_API_KEY,
            'BBOX': f"{bbox['lat_min']},{bbox['lng_min']},{bbox['lat_max']},{bbox['lng_max']}",
            'format': 'json'
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        print(response.json())
        return response.json().get('cells', [])
    except Exception as e:
        print(f"Error fetching cell towers: {e}")
        return []

def calculate_network_strength(lat, lng, radius=0.0085):
    """Calculate average network strength in a small radius"""
    try:
        bbox = {
            'lat_min': lat - radius,
            'lat_max': lat + radius,
            'lng_min': lng - radius,
            'lng_max': lng + radius
        }
        towers = get_cell_towers_in_area(bbox)
        if not towers:
            return None
        
        strengths = [min(tower.get('averageSignalStrength', -70) for tower in towers)]
        return sum(strengths) / len(strengths)
    except Exception as e:
        print(f"Error calculating network strength: {e}")
        return None

def cluster_tasmac_locations():
    """Cluster TASMAC locations to identify high-density areas"""
    try:
        if not tasmac_locations:
            return []
            
        coordinates = [[loc['lat'], loc['lng']] for loc in tasmac_locations]
        
        # Use DBSCAN to find clusters (eps in degrees, ~500m)
        clustering = DBSCAN(eps=0.005, min_samples=2).fit(coordinates)
        
        # Add cluster labels to locations
        for i, loc in enumerate(tasmac_locations):
            loc['cluster'] = clustering.labels_[i]
        
        # Group by cluster and calculate centroids
        clusters = defaultdict(list)
        for loc in tasmac_locations:
            if loc['cluster'] != -1:  # -1 means no cluster
                clusters[loc['cluster']].append(loc)
        
        # Calculate centroids for each cluster
        centroids = []
        for cluster_id, locations in clusters.items():
            avg_lat = sum(loc['lat'] for loc in locations) / len(locations)
            avg_lng = sum(loc['lng'] for loc in locations) / len(locations)
            
            centroids.append({
                'lat': avg_lat,
                'lng': avg_lng,
                'count': len(locations),
                'radius': 0.003 * len(locations),  # Dynamic radius based on cluster size
                'shops': [{'name': loc['name'], 'address': loc['address']} for loc in locations]
            })
        
        return centroids
    except Exception as e:
        print(f"Error clustering TASMAC locations: {e}")
        return []

def calculate_point_risk(lat, lng):
    """Calculate comprehensive risk score for a specific point"""
    try:
        # 1. Calculate base risk from GMM model
        point = scaler.transform([[lat, lng]])[0]
        gmm_density = np.exp(gmm.score_samples([[lat, lng]]))
        base_risk = gmm_density[0]
        
        # 2. Check proximity to TASMAC clusters
        tasmac_clusters = cluster_tasmac_locations()
        tasmac_risk = 0
        nearby_shops = []
        
        for cluster in tasmac_clusters:
            distance = np.sqrt((lat - cluster['lat'])**2 + (lng - cluster['lng'])**2)
            if distance < cluster['radius']:
                # Calculate risk contribution (closer and larger clusters contribute more)
                risk_contribution = (cluster['count'] * 0.5) * (1 - (distance / cluster['radius']))
                tasmac_risk += risk_contribution
                
                # If significant risk, include shop info
                if risk_contribution > 0.2:
                    nearby_shops.extend(cluster['shops'])
        
        # 3. Incorporate network strength
        network_strength = calculate_network_strength(lat, lng)
        if network_strength is None:
            network_strength = -85  # Default average strength
            
        # Normalize network strength (better signal -> lower risk)
        # -50dBm is excellent, -90dBm is poor
        network_factor = max(0, min(1, (-network_strength - 50) / 40))
        
        # Combine all factors with weights
        total_risk = (0.6 * base_risk) + (0.3 * tasmac_risk) + (0.1 * network_factor)
        
        return {
            'total_risk': total_risk,
            'base_risk': base_risk,
            'tasmac_risk': tasmac_risk,
            'network_strength': network_strength,
            'nearby_tasmac_shops': nearby_shops[:3]  # Return max 3 nearby shops
        }
    except Exception as e:
        print(f"Error in calculate_point_risk: {e}")
        return None

def get_safe_route(src, dest):
    """Get the safest route considering TASMAC locations and network strength"""
    try:
        print("received")
        coords = [
            [src['longitude'], src['latitude']],
            [dest['longitude'], dest['latitude']]
        ]
        
        route_preferences = ['recommended', 'shortest', 'fastest']
        routes = []
        
        for preference in route_preferences:
            route = ors_client.directions(
                coordinates=coords,
                profile='foot-walking',
                format='geojson',
                preference=preference
            )
            routes.append(route)
        
        safest_route = None
        lowest_risk = float('inf')
        route_details = []
        tasmac_warnings = set()
        
        for route in routes:
            total_risk = 0
            path = []
            segment_risks = []
            current_warnings = set()
            
            for coord in route['features'][0]['geometry']['coordinates']:
                lng, lat = coord
                risk_data = calculate_point_risk(lat, lng)
                if risk_data:
                    path.append((lat, lng))
                    total_risk += risk_data['total_risk']
                    segment_risks.append({
                        'lat': lat,
                        'lng': lng,
                        'risk': risk_data['total_risk'],
                        'network_strength': risk_data['network_strength'],
                        'nearby_shops': risk_data['nearby_tasmac_shops']
                    })
                    
                    # Collect unique TASMAC warnings along route
                    for shop in risk_data['nearby_tasmac_shops']:
                        current_warnings.add(f"{shop['name']} ({shop['address']})")
            
            if total_risk < lowest_risk:
                lowest_risk = total_risk
                safest_route = path
                route_details = segment_risks
                tasmac_warnings = current_warnings
        
        if safest_route:
            encoded_polyline = polyline.encode(safest_route) 
            print(encoded_polyline)
            return {
                'polyline': encoded_polyline,
                'total_risk': lowest_risk,
                'segments': route_details,
                'tasmac_warnings': list(tasmac_warnings),
                'route_stats': {
                    'tasmac_risk': sum(seg['risk'] * 0.3 for seg in route_details),
                    'network_risk': sum(seg['risk'] * 0.1 for seg in route_details),
                    'base_risk': sum(seg['risk'] * 0.6 for seg in route_details)
                }
            }
        else:
            raise ValueError("No safe route found")
    
    except Exception as e:
        print(f"Error in get_safe_route: {e}")
        return None

@app.route("/get_safe_route", methods=["POST"])
def api_get_safe_route():
    data = request.json
    src = data.get("src")
    dest = data.get("dest")
    
    if not src or not dest:
        return jsonify({"error": "Missing source or destination"}), 400

    try:
        if not all(key in src for key in ['latitude', 'longitude']) or \
           not all(key in dest for key in ['latitude', 'longitude']):
            return jsonify({"error": "Invalid format for source or destination"}), 400

        route_data = get_safe_route(src, dest)
        if route_data:
            return jsonify({
                "safest_polyline": route_data['polyline'],
                "total_risk": route_data['total_risk'],
                "segments": route_data['segments'],
                "tasmac_warnings": route_data['tasmac_warnings'],
                "route_stats": route_data['route_stats'],
                "message": "Route calculated considering TASMAC locations and network strength"
            })
        else:
            return jsonify({"error": "Unable to fetch safe route"}), 500
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8000)
