import pymongo
import pandas as pd
import matplotlib.pyplot as plt
from fpdf import FPDF
from datetime import datetime
import re
import os
import json
from llama_index.llms.groq import Groq

class StoryAnalyzer:
    def __init__(self, db_uri="<>", db_name="WithU", collection_name="stories"):
        """Initialize the StoryAnalyzer with MongoDB connection and Groq LLM"""
        # Database connection
        self.client = pymongo.MongoClient(db_uri)
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]
        
        # Initialize Groq LLM
        self.llm_model_name = "llama-3.3-70b-versatile"
        self.api_key = "<>"
        
        try:
            self.llm = Groq(
                model=self.llm_model_name,
                api_key=self.api_key,
                temperature=0.2  # Lower temperature for more consistent results
            )
            print("Groq LLM initialized successfully")
        except Exception as e:
            print(f"Error initializing Groq LLM: {str(e)}")
            self.llm = None
        
    def extract_stories(self):
        """Extract all stories from the MongoDB collection"""
        stories = list(self.collection.find())
        print(f"Extracted {len(stories)} stories from database")
        return stories
    
    def analyze_story_content(self, story):
        """Use Groq LLM to analyze story content for severity, locations, and themes"""
        if not self.llm:
            # Fallback simple analysis if LLM is not available
            return self._simple_fallback_analysis(story)
        
        title = story.get('title', '')
        description = story.get('description', '')
        full_text = f"{title} {description}"
        
        # Create prompt for LLM analysis
        prompt = f"""Analyze the following story text and provide a structured assessment in JSON format:

Story Title: {title}
Story Description: {description}

Provide analysis in this exact JSON format:
{{
    "severity_level": "Critical|High|Medium|Low",
    "severity_explanation": "Brief explanation of severity assessment",
    "locations": ["Location1", "Location2"],
    "main_topics": ["Topic1", "Topic2", "Topic3"],
    "sentiment": {{"negative": 0-1 scale, "neutral": 0-1 scale, "positive": 0-1 scale}},
    "word_count": integer,
    "audience_impact": "Brief assessment of potential impact on readers",
    "key_entities": ["Entity1", "Entity2"],
    "summary": "One sentence summary of story content"
}}

Be objective and accurate in your assessment. For severity, "Critical" means extremely concerning/urgent content, "High" means very serious issues, "Medium" is moderately concerning, and "Low" is minor or not concerning.
"""
        
        try:
            # Get LLM response
            response = self.llm.complete(prompt)
            
            # Extract JSON from response
            try:
                # Find JSON content in the response
                json_match = re.search(r'({.*})', str(response).replace('\n', ''), re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group(0))
                else:
                    # If no JSON found, try again with a more structured approach
                    analysis = json.loads(str(response))
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON from LLM response: {e}")
                print(f"Raw response: {response}")
                # Fall back to simple analysis
                analysis = self._simple_fallback_analysis(story)
                
            # Add additional fields
            analysis['id'] = str(story.get('_id'))
            analysis['author_id'] = story.get('author_id')
            analysis['title'] = story.get('title', 'No Title')
            analysis['created_at'] = story.get('createdAt', datetime.now())
            
            return analysis
            
        except Exception as e:
            print(f"Error during LLM analysis: {str(e)}")
            return self._simple_fallback_analysis(story)
    
    def _simple_fallback_analysis(self, story):
        """Simple analysis as fallback if LLM fails"""
        title = story.get('title', '')
        description = story.get('description', '')
        text = f"{title} {description}"
        
        # Simple word counting
        word_count = len(text.split())
        
        # Simple location extraction
        location_patterns = [
            r'in ([A-Z][a-z]+(?: [A-Z][a-z]+)*)', 
            r'at ([A-Z][a-z]+(?: [A-Z][a-z]+)*)',
            r'from ([A-Z][a-z]+(?: [A-Z][a-z]+)*)'
        ]
        
        potential_locations = []
        for pattern in location_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                potential_locations.append(match.group(1))
                
        locations = list(set(potential_locations)) if potential_locations else ["Unknown"]
        
        # Simple severity calculation based on negative word counts
        negative_words = ['urgent', 'emergency', 'critical', 'danger', 'severe', 'serious', 'harm', 'risk', 'threat']
        neg_count = sum(1 for word in negative_words if word in text.lower())
        
        if neg_count >= 3:
            severity = "Critical"
        elif neg_count >= 2:
            severity = "High"
        elif neg_count >= 1:
            severity = "Medium"
        else:
            severity = "Low"
            
        return {
            'id': str(story.get('_id')),
            'author_id': story.get('author_id'),
            'title': story.get('title', 'No Title'),
            'severity_level': severity,
            'severity_explanation': f"Based on presence of {neg_count} negative keywords",
            'locations': locations,
            'main_topics': ["Topic analysis unavailable"],
            'sentiment': {"negative": 0.33, "neutral": 0.34, "positive": 0.33},
            'word_count': word_count,
            'audience_impact': "Analysis unavailable",
            'key_entities': ["Entity analysis unavailable"],
            'summary': "Simple fallback analysis due to LLM error",
            'created_at': story.get('createdAt', datetime.now())
        }
    
    def content_analysis(self, stories):
        """Analyze stories for content insights using the LLM"""
        analyzed_stories = []
        
        for i, story in enumerate(stories):
            print(f"Analyzing story {i+1}/{len(stories)}: {story.get('title', 'No Title')}")
            analysis = self.analyze_story_content(story)
            analyzed_stories.append(analysis)
            
        return analyzed_stories
    
    def generate_summary_stats(self, analyzed_stories):
        """Generate summary statistics from the analyzed stories"""
        if not analyzed_stories:
            return {}
            
        severity_counts = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
        locations = {}
        topics = {}
        entities = {}
        total_words = 0
        avg_sentiment = {'negative': 0, 'neutral': 0, 'positive': 0}
        
        for story in analyzed_stories:
            # Count severities
            severity = story.get('severity_level', 'Low')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            # Count locations
            for loc in story.get('locations', []):
                if loc != "Unknown":
                    locations[loc] = locations.get(loc, 0) + 1
            
            # Count topics
            for topic in story.get('main_topics', []):
                if topic != "Topic analysis unavailable":
                    topics[topic] = topics.get(topic, 0) + 1
                    
            # Count entities
            for entity in story.get('key_entities', []):
                if entity != "Entity analysis unavailable":
                    entities[entity] = entities.get(entity, 0) + 1
            
            # Sum words
            total_words += story.get('word_count', 0)
            
            # Sum sentiments
            sentiment = story.get('sentiment', {'negative': 0, 'neutral': 0, 'positive': 0})
            for key in avg_sentiment:
                avg_sentiment[key] += sentiment.get(key, 0)
        
        # Calculate averages
        count = len(analyzed_stories)
        for key in avg_sentiment:
            avg_sentiment[key] = avg_sentiment[key] / count if count > 0 else 0
            
        return {
            'total_stories': count,
            'severity_counts': severity_counts,
            'top_locations': dict(sorted(locations.items(), key=lambda x: x[1], reverse=True)[:5]),
            'top_topics': dict(sorted(topics.items(), key=lambda x: x[1], reverse=True)[:5]),
            'top_entities': dict(sorted(entities.items(), key=lambda x: x[1], reverse=True)[:5]),
            'avg_word_count': total_words / count if count > 0 else 0,
            'avg_sentiment': avg_sentiment
        }
    
    def create_visualizations(self, summary_stats, analyzed_stories):
        """Create visualizations for the report"""
        # Create directory for visualizations if it doesn't exist
        os.makedirs('viz', exist_ok=True)
        
        viz_paths = []
        
        # 1. Severity Distribution Pie Chart
        plt.figure(figsize=(8, 6))
        labels = list(summary_stats['severity_counts'].keys())
        sizes = list(summary_stats['severity_counts'].values())
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=['#FF5252', '#FFA726', '#FDD835', '#66BB6A'])
        plt.axis('equal')
        plt.title('Story Severity Distribution')
        plt.savefig('viz/severity_distribution.png', bbox_inches='tight')
        plt.close()
        viz_paths.append('viz/severity_distribution.png')
        
        # 2. Top Locations Bar Chart
        if summary_stats['top_locations']:
            plt.figure(figsize=(10, 6))
            locations = list(summary_stats['top_locations'].keys())
            counts = list(summary_stats['top_locations'].values())
            plt.bar(locations, counts, color='skyblue')
            plt.xticks(rotation=45, ha='right')
            plt.title('Top Mentioned Locations')
            plt.xlabel('Location')
            plt.ylabel('Count')
            plt.tight_layout()
            plt.savefig('viz/top_locations.png', bbox_inches='tight')
            plt.close()
            viz_paths.append('viz/top_locations.png')
        
        # 3. Top Topics Bar Chart
        if summary_stats['top_topics']:
            plt.figure(figsize=(10, 6))
            topics = list(summary_stats['top_topics'].keys())
            counts = list(summary_stats['top_topics'].values())
            plt.bar(topics, counts, color='lightgreen')
            plt.xticks(rotation=45, ha='right')
            plt.title('Top Story Topics')
            plt.xlabel('Topic')
            plt.ylabel('Count')
            plt.tight_layout()
            plt.savefig('viz/top_topics.png', bbox_inches='tight')
            plt.close()
            viz_paths.append('viz/top_topics.png')
        
        # 4. Sentiment Analysis Radar Chart
        if len(analyzed_stories) > 0:
            # Create data for sentiment radar chart
            sentiments = list(summary_stats['avg_sentiment'].keys())
            values = list(summary_stats['avg_sentiment'].values())
            
            # Number of variables
            N = len(sentiments)
            
            # What will be the angle of each axis in the plot
            angles = [n / float(N) * 2 * 3.14159 for n in range(N)]
            angles += angles[:1]  # Close the loop
            
            # Add the first value again to close the circle
            values += values[:1]
            
            # Create the plot
            fig = plt.figure(figsize=(8, 8))
            ax = fig.add_subplot(111, polar=True)
            
            # Draw one axis per variable + add labels
            plt.xticks(angles[:-1], sentiments)
            
            # Plot data
            ax.plot(angles, values, linewidth=2, linestyle='solid')
            
            # Fill area
            ax.fill(angles, values, alpha=0.25)
            
            # Add title
            plt.title('Average Sentiment Analysis', size=15)
            
            # Save the chart
            plt.savefig('viz/sentiment_analysis.png', bbox_inches='tight')
            plt.close()
            viz_paths.append('viz/sentiment_analysis.png')
            
        return viz_paths
    
    def generate_pdf_report(self, analyzed_stories, summary_stats, viz_paths):
        """Generate a PDF report from the analysis"""
        today = datetime.now().strftime('%Y-%m-%d')
        pdf = FPDF()
        
        # Add a Unicode-compatible font (DejaVu supports broader character sets)
        # Note: You'll need to download DejaVuSans.ttf and place it in your project directory
        try:
            pdf.add_font('DejaVu', '', 'DejaVuSans.ttf', uni=True)
            font_name = 'DejaVu'
        except Exception as e:
            print(f"Failed to load DejaVu font: {e}. Falling back to Arial.")
            font_name = 'Arial'  # Fallback to Arial if font is unavailable
        
        # Add title page
        pdf.add_page()
        pdf.set_font(font_name, 'B', 24)
        pdf.cell(0, 30, 'Story Analysis Report', 0, 1, 'C')
        pdf.set_font(font_name, 'I', 14)
        pdf.cell(0, 10, f'Generated on {today}', 0, 1, 'C')
        pdf.cell(0, 10, f'Total Stories Analyzed: {summary_stats["total_stories"]}', 0, 1, 'C')
        
        # Add summary page
        pdf.add_page()
        pdf.set_font(font_name, 'B', 18)
        pdf.cell(0, 20, 'Executive Summary', 0, 1, 'L')
        
        pdf.set_font(font_name, '', 12)
        summary_text = f'This report analyzes {summary_stats["total_stories"]} stories from the WithU database, using advanced AI text analysis to assess content severity, locations, topics, and sentiment.'
        pdf.multi_cell(0, 10, self._sanitize_text(summary_text))
        
        # Severity statistics
        pdf.set_font(font_name, 'B', 14)
        pdf.cell(0, 15, 'Severity Distribution', 0, 1, 'L')
        pdf.set_font(font_name, '', 12)
        for severity, count in summary_stats['severity_counts'].items():
            percentage = (count / summary_stats["total_stories"] * 100) if summary_stats["total_stories"] > 0 else 0
            text = f'{severity}: {count} stories ({percentage:.1f}%)'
            pdf.cell(0, 10, self._sanitize_text(text), 0, 1)
        
        # Location statistics
        if summary_stats['top_locations']:
            pdf.set_font(font_name, 'B', 14)
            pdf.cell(0, 15, 'Top Mentioned Locations', 0, 1, 'L')
            pdf.set_font(font_name, '', 12)
            for location, count in summary_stats['top_locations'].items():
                text = f'{location}: {count} mentions'
                pdf.cell(0, 10, self._sanitize_text(text), 0, 1)
        
        # Topic statistics
        if summary_stats['top_topics']:
            pdf.set_font(font_name, 'B', 14)
            pdf.cell(0, 15, 'Top Story Topics', 0, 1, 'L')
            pdf.set_font(font_name, '', 12)
            for topic, count in summary_stats['top_topics'].items():
                text = f'{topic}: {count} stories'
                pdf.cell(0, 10, self._sanitize_text(text), 0, 1)
        
        # Entity statistics
        if summary_stats['top_entities']:
            pdf.set_font(font_name, 'B', 14)
            pdf.cell(0, 15, 'Top Entities Mentioned', 0, 1, 'L')
            pdf.set_font(font_name, '', 12)
            for entity, count in summary_stats['top_entities'].items():
                text = f'{entity}: {count} mentions'
                pdf.cell(0, 10, self._sanitize_text(text), 0, 1)
        
        # Average statistics
        pdf.set_font(font_name, 'B', 14)
        pdf.cell(0, 15, 'Content Statistics', 0, 1, 'L')
        pdf.set_font(font_name, '', 12)
        pdf.cell(0, 10, f'Average Word Count: {summary_stats["avg_word_count"]:.1f} words', 0, 1)
        pdf.cell(0, 10, f'Average Negative Sentiment: {summary_stats["avg_sentiment"]["negative"]:.2f}', 0, 1)
        pdf.cell(0, 10, f'Average Positive Sentiment: {summary_stats["avg_sentiment"]["positive"]:.2f}', 0, 1)
        pdf.cell(0, 10, f'Average Neutral Sentiment: {summary_stats["avg_sentiment"]["neutral"]:.2f}', 0, 1)
        
        # Add visualizations
        for viz_path in viz_paths:
            if os.path.exists(viz_path):
                pdf.add_page()
                pdf.set_font(font_name, 'B', 16)
                title = viz_path.split('/')[-1].replace('_', ' ').replace('.png', '').title()
                pdf.cell(0, 20, self._sanitize_text(title), 0, 1, 'C')
                pdf.image(viz_path, x=25, w=160)
        
        # Add detailed story list
        pdf.add_page()
        pdf.set_font(font_name, 'B', 18)
        pdf.cell(0, 20, 'Detailed Story Analysis', 0, 1, 'L')
        
        for i, story in enumerate(analyzed_stories):
            if i > 0 and i % 2 == 0:
                pdf.add_page()
                
            pdf.set_font(font_name, 'B', 12)
            pdf.cell(0, 10, f"Story: {self._sanitize_text(story['title'])}", 0, 1)
            
            pdf.set_font(font_name, '', 10)
            pdf.cell(0, 8, f"Author ID: {self._sanitize_text(str(story['author_id']))}", 0, 1)
            pdf.cell(0, 8, f"Severity: {self._sanitize_text(story.get('severity_level', 'Unknown'))}", 0, 1)
            
            # Format the locations as a string
            locations = ', '.join(story.get('locations', ['Unknown']))
            pdf.cell(0, 8, f"Locations: {self._sanitize_text(locations)}", 0, 1)
            
            # Format the topics as a string
            topics = ', '.join(story.get('main_topics', ['Unknown']))
            pdf.cell(0, 8, f"Topics: {self._sanitize_text(topics)}", 0, 1)
            
            pdf.cell(0, 8, f"Word Count: {story.get('word_count', 0)}", 0, 1)
            
            # Format the created_at date
            created_at = story['created_at']
            if isinstance(created_at, datetime):
                created_at_str = created_at.strftime('%Y-%m-%d')
            else:
                created_at_str = str(created_at)
            pdf.cell(0, 8, f"Created: {self._sanitize_text(created_at_str)}", 0, 1)
            
            # Add summary if available
            if 'summary' in story and story['summary'] != "Simple fallback analysis due to LLM error":
                pdf.set_font(font_name, 'I', 10)
                pdf.multi_cell(0, 8, f"Summary: {self._sanitize_text(story['summary'])}")
            
            # Add audience impact if available
            if 'audience_impact' in story and story['audience_impact'] != "Analysis unavailable":
                pdf.set_font(font_name, '', 10)
                pdf.multi_cell(0, 8, f"Impact: {self._sanitize_text(story['audience_impact'])}")
            
            pdf.cell(0, 6, "", 0, 1)  # Spacing between stories
        
        # Save the PDF
        filename = f'story_analysis_report_{today}.pdf'
        pdf.output(filename)
        print(f"Report generated: {filename}")
        return filename

    def _sanitize_text(self, text):
        """Sanitize text to remove or replace non-Latin-1 characters"""
        if not isinstance(text, str):
            text = str(text)
        # Replace problematic characters with safe alternatives or remove them
        sanitized = text.encode('latin-1', errors='replace').decode('latin-1')
        # Alternatively, strip out anything not in Latin-1 range
        sanitized = ''.join(c if ord(c) < 256 else '?' for c in sanitized)
        return sanitized

    def run_analysis(self):
            """Run the full analysis pipeline"""
            print("Starting story analysis...")
            stories = self.extract_stories()
            
            if not stories:
                print("No stories found in database")
                return None
            
            print("Analyzing story content using Groq LLM...")
            analyzed_stories = self.content_analysis(stories)
            
            print("Generating summary statistics...")
            summary_stats = self.generate_summary_stats(analyzed_stories)
            
            print("Creating visualizations...")
            viz_paths = self.create_visualizations(summary_stats, analyzed_stories)
            
            print("Generating PDF report...")
            report_path = self.generate_pdf_report(analyzed_stories, summary_stats, viz_paths)
            
            print("Analysis complete!")
            return report_path

# Main execution block
if __name__ == "__main__":
    analyzer = StoryAnalyzer()
    report_path = analyzer.run_analysis()
    
    if report_path:
        print(f"Report successfully generated at: {report_path}")
    else:
        print("Failed to generate report")
