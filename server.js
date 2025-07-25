// server.js (Example)
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors"); // If you need CORS
const { connectDB } = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const housesRoutes = require("./routes/houses");
const rentRequestsRoutes = require("./routes/rentRequests");
const rentPaymentsRoutes = require("./routes/rentPayments");
const rentRemindersRoutes = require("./routes/rentReminders");
const leaseAgreementRoutes = require("./routes/leaseAgreementRoutes");
const maintenanceRequestRoutes = require("./routes/maintenanceRequestRoutes");

const notificationRoutes = require("./routes/notificationRoutes");
const authRoutes = require("./routes/auth");
// const houseRoutes = require('./routes/houses'); // Uncomment when you create these

// Load environment variables
dotenv.config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json()); // Body parser for JSON
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded data

// Enable CORS (if frontend is on a different domain)
// app.use(cors({ origin: process.env.FRONTEND_URL }));

// Define Routes
app.use("/api/auth", authRoutes);
app.use("/api/houses", housesRoutes);
app.use("/api/rent-requests", rentRequestsRoutes);
app.use("/api/rent-payments", rentPaymentsRoutes);
app.use("/api/rent-reminders", rentRemindersRoutes);
app.use("/api/leases", leaseAgreementRoutes);
app.use("/api/maintenance-requests", maintenanceRequestRoutes);
app.use("/api/notifications", notificationRoutes);
// Basic route for testing
app.get("/", (req, res) => {
  res.send("Real Estate Backend API is running!");
});

// Error handling middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1)); // If you have a server instance
  process.exit(1);
});
