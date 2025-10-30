# SDR Script Tool

A streamlined cold-calling workflow tool that turns exported Apollo CSVs into organized, guided call flows with automated script generation and Slack integration.

## Features

- **CSV Upload**: Upload Apollo export CSVs with automatic parsing and grouping
- **Template Management**: Create and edit call script templates with variable substitution
- **Call Flow**: Sequential navigation through contacts with auto-generated scripts
- **Slack Integration**: One-click sending of contact details to Slack for mobile dialing

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Slack Bot Token (for Slack integration)

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Slack configuration:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   SLACK_USER_ID=U1234567890
   PORT=5000
   NODE_ENV=development
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3005`

## Slack Setup

To enable the "Send to Slack" feature:

1. Create a Slack App at https://api.slack.com/apps
2. Add the following OAuth scopes:
   - `chat:write`
   - `im:write`
3. Install the app to your workspace
4. Copy the Bot User OAuth Token to your `.env` file
5. Get your Slack User ID and add it to the `.env` file

## Usage

### 1. Upload CSV
- Export your contacts from Apollo as a CSV
- Upload the CSV file through the Upload tab
- The tool will automatically parse and group contacts by role/tag

### 2. Manage Templates
- Navigate to the Templates tab
- Edit call script templates for different roles
- Use variables like `{{first_name}}`, `{{company}}`, etc.

### 3. Make Calls
- Go to the Call Flow tab
- Select a role group to work with
- Review the auto-generated script for each contact
- Click "Send Number to Slack" to get the contact info on your phone
- Use Previous/Next buttons to navigate through contacts

## CSV Format

Your Apollo CSV should include these columns:
- `first_name` or `First Name`
- `last_name` or `Last Name` 
- `company` or `Company`
- `role` or `Role`
- `phone` or `Phone`
- `tag` or `Tag` (optional)

## Template Variables

Use these variables in your call script templates:
- `{{first_name}}` - Contact's first name
- `{{last_name}}` - Contact's last name
- `{{company}}` - Company name
- `{{role}}` - Contact's role
- `{{phone}}` - Phone number

## Development

### Project Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── package.json     # Root package.json
└── README.md
```

### Available Scripts
- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build for production

## Troubleshooting

### Common Issues

1. **Slack integration not working**
   - Verify your Slack Bot Token is correct
   - Ensure the bot has the required permissions
   - Check that your Slack User ID is correct

2. **CSV upload fails**
   - Ensure your CSV has the required columns
   - Check that the file is a valid CSV format
   - Try with a smaller CSV file first

3. **Templates not saving**
   - Check browser console for errors
   - Ensure you have write permissions

## License

MIT License - feel free to use and modify as needed.
