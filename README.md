# Corpotism Knowledge Base

A static web interface for browsing and accessing the Corpotism knowledge base. This interface is designed to be hosted on GitHub Pages and provides a user-friendly way to explore topics and subtopics related to corporate communication and workplace interactions.

## Features

- **Topic Browser**: Browse through main topics and their related subtopics
- **Detailed Views**: Click on any topic or subtopic to view detailed information including:
  - Importance/Relation to Parent Topic
  - Key Challenges
  - Strategies
  - Examples
  - Action Steps
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Chat Interface**: (Coming Soon) Interactive chat functionality for dynamic knowledge base queries

## Setup

1. Ensure all files are in the root directory:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `knowledge_base.json`
   - `serve.py` (for local development)

2. The interface will automatically load the knowledge base from `knowledge_base.json` when opened.

## Local Development

Due to browser security restrictions, you cannot directly open `index.html` using the `file://` protocol as it will block loading the JSON file. Instead, use one of these methods:

### Using Python (Recommended)

1. Make sure you have Python installed (Python 3.x recommended)
2. Open a terminal in the project directory
3. Run the local server:
   ```bash
   python serve.py
   ```
4. Visit `http://localhost:8000` in your browser

### Using VS Code

If you're using Visual Studio Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Using Node.js

If you prefer using Node.js:
1. Install `http-server` globally:
   ```bash
   npm install -g http-server
   ```
2. Run in the project directory:
   ```bash
   http-server
   ```
3. Visit the URL shown in the terminal

## Usage

1. Start the local development server using one of the methods above
2. Browse through topics in the main panel
3. Click on any topic or subtopic to view detailed information
4. Use the navigation menu to switch between different views (Topics/Chat)

## Technical Details

- Built with vanilla JavaScript for maximum compatibility
- Uses Tailwind CSS for styling
- No server-side dependencies required
- CORS-friendly: Loads JSON data from the same origin

## Development

To modify or extend the knowledge base:

1. Edit `knowledge_base.json` to add or modify topics
2. Follow the existing JSON structure:
   ```json
   {
     "category": "TOPIC|SUBTOPIC",
     "title": "Topic Title",
     "body": "Topic Content",
     "id": "unique-id",
     "parent_id": "parent-topic-id",
     "metadata": {
       "importance": "...",
       "challenges": ["..."],
       "strategies": ["..."],
       "examples": ["..."],
       "action_steps": ["..."]
     }
   }
   ```

## Deployment

1. Push all files to your GitHub repository
2. Enable GitHub Pages in your repository settings
3. The interface will be available at your GitHub Pages URL

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- The chat functionality is currently a placeholder and will be implemented in a future update
- All data is loaded client-side for maximum compatibility with static hosting
- The interface is designed to be lightweight and fast-loading
- For local development, always use a proper web server instead of opening files directly 