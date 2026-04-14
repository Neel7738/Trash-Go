# TrashGo - Smart Waste Management System

TrashGo is a full-stack civic-tech platform that connects citizens with government authorities for efficient waste management. It empowers users to report waste accumulation in their localities and allows administrators to manage and track the cleanup process effectively.

## 🚀 Features

- **User Authentication:** Secure signup and login with JWT-based sessions.
- **Report Submission:** Citizens can upload images of garbage, provide descriptions, and share their precise geolocation.
- **Gamification & Leaderboard:** Users earn Eco-Points for reporting and successful cleanups. A real-time leaderboard ranks Top Eco-Warriors to encourage friendly competition!
- **Heatmap Visualizations:** Interactive maps powered by Leaflet automatically visualize high-priority problem areas to both admins and citizens.
- **Automated Priority Calculation:** Reports are automatically prioritized based on their proximity to other reports, helping admins identify major waste clusters.
- **Admin Dashboard:** Admins can view all reports, grouped logically by location (using OpenStreetMap reverse geocoding), and manage their status (Pending, In Progress, Completed).
- **Time-Lapse Sliders:** Cleanups are visually verified by admins using dynamic sliders showcasing before/after images seamlessly.
- **Glassmorphic Web Interface:** Immersive UI using customized dark-theme variables, modern responsive grids, and integrated hardware APIs.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Leaflet.js (for Heatmaps)
- **Backend:** Node.js, Express.js (v5+)
- **Database:** MongoDB Atlas with Mongoose
- **Image Storage:** Cloudinary
- **Geocoding:** OpenStreetMap (Nominatim API)
- **AI Integration (Experimental):** Ready for Google Gemini integration.

## 📁 Project Structure

```text
├── config/             # Configuration for DB and Cloudinary
├── middleware/         # Custom Express middlewares (auth, admin)
├── models/             # Mongoose schemas (User, Report)
├── public/             # Static frontend files (HTML, CSS, JS)
├── routes/             # API route handlers
├── server.js           # Main application entry point
├── init_admin.js       # Utility script to initialize or reset admin user
├── diagnose_db.js      # Utility script for database diagnostics
└── .env                # Environment variables (not tracked in Git)
```


## 🔄 Application Flow

1. **Signup:** Create a new user account to start earning Eco-Points.
2. **Report:** Fill out the report form, capture/upload an image, and submit your location.
3. **Earn Points:** Receive 10 Eco-Points for each submission and another 50 when the cleanup is completed.
4. **Admin Review:** Administrators log in to view clusters of reports, navigate to locations, and update statuses.
5. **Completion:** Admin uploads a verification image of the cleaned area to resolve the report.

## 🔮 Future Scope
- **AI-Based Waste Detection:** Automatic classification of waste types using generative models.
- **Mobile Application:** Native Android/iOS versions for robust offline reporting capabilities.
- **Automated Verification:** Smart image verification to ensure "After" cleanup images align with the coordinates of the "Before" images.

## 👨‍💻 Creator
Built by **Niraj**. Connect with me:
- **LinkedIn:** [www.linkedin.com/in/niraj-nandre](https://www.linkedin.com/in/niraj-nandre)
- **GitHub:** [https://github.com/Neel7738](https://github.com/Neel7738)

## 📜 License
This project is licensed under the ISC License.
