# Campus Carbon Challenge Game and Dashboard

## Overview
Educating 1st year students and staff at the University of Exeter about its sustainability goals and reducing overall carbon emissions by promoting individual behavior change. We have developed a game and dashboard where users complete in weekly and monthly challenges for points that rewards activities that save C02.

## Live demo
To access the website, click on the following link: 

https://groupproject-e980.onrender.com/

A screen should appear which will signify that the backend is being retrieved, please wait for the main page to load.
Users will be directed to the main dashboard where the following actions can be completed:
- Create an account (via 'Sign Up') to access the full platform
- Log in using existing credentials
- Accounts can be deleted via the 'Settings' tab

## Scrum board
https://github.com/users/Erikabuckley/projects/2

## Features
- User Registration and Login
- Moderator Registration and Login
- Role-Based Access Control (Participant and Moderator)
- Ability to join groups
- Log carbon-saving actions aligned with a range of missions, including evidence uploads for moderation
- Ability to submit actions to various challenges, which can be apart of a group submission (for competing)
- Ability to earn badges by completing defined mission and challenges
- View fun facts relating to sustainability and CO2 emissions
- View total CO2 emissions saved (with transparent CO2 calculation factors), and the points earned
- View metrics and tables relating to both group and individual activities
- Moderator accounts with premissions to create, edit, and delete challenges
- Moderator accounts with the responsibility to approve or deny submissions, according to anti-gaming flags
- Access to Terms & Conditions, Accessibility Statement(s), and Privacy Policy

## Requirements
- Node.js must be installed (v20+ recommended), to check if Node.js is installed please run 
```bash 
node --version
``` 
If Node.js is not installed, please download from https://nodejs.org/en
- npm (inbuilt with Node.js).
- A modern web browser (for example Google Chrome).
- 

## Environment Variables
Create a `.env` file in the root directory and add:
- SESSION_SECRET=[placeholder]

## Installation
### Clone or download the repository

```bash
git clone https://github.com/Erikabuckley/GroupProject.git
```

Or download directly and unzip

### Install dependencies
Navigate to the project folder:

```bash
cd GroupProject-main
npm install
```
### Dependency Warning Disclaimer
Some npm packages may report security vulnerabilities during installation. These are known and do not impact the functionality of the application. They have been retained to ensure compatibility with Node.js v20.

### Running the application locally
To start the development server run:

```bash 
npm run dev
```
Click the link in the terminal  to display the website in your browser.
## Contributions
This repository has been created for academic assessment purposes.  
Any forks or redistributions must retain the original MIT License.

## License
This project is licensed under the MIT license - see license file for details.

## Members
Erika Buckley ekb209@exeter.ac.uk : Project lead\
Tanisha Sharma ts876@exeter.ac.uk : Technical lead\
Aoife Richards ar1070@exeter.ac.uk : Data and ML lead\
Nehir Yurtsever ny292@exeter.ac.uk : QA lead\
Keira Manglani knm205@exeter.ac.uk : DevOps\
Darcy Luke dal209@exeter.ac.uk : UI & UX & Requirements\
Thalia Champ tc788@exeter.ac.uk : Documentation and Comms
