// database.js - Client-side database for Rosarians website

// Initialize the database
function initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("RosariansDB", 1)
  
      // Create database schema when needed
      request.onupgradeneeded = (event) => {
        const db = event.target.result
  
        // Users store - for admin accounts
        if (!db.objectStoreNames.contains("users")) {
          const usersStore = db.createObjectStore("users", { keyPath: "username" })
          usersStore.createIndex("email", "email", { unique: true })
        }
  
        // Media store - for band photos and videos
        if (!db.objectStoreNames.contains("media")) {
          const mediaStore = db.createObjectStore("media", { keyPath: "id", autoIncrement: true })
          mediaStore.createIndex("type", "type", { unique: false })
          mediaStore.createIndex("category", "category", { unique: false })
          mediaStore.createIndex("uploadDate", "uploadDate", { unique: false })
          mediaStore.createIndex("username", "username", { unique: false })
        }
  
        // Reviews store - for customer reviews
        if (!db.objectStoreNames.contains("reviews")) {
          const reviewsStore = db.createObjectStore("reviews", { keyPath: "id", autoIncrement: true })
          reviewsStore.createIndex("rating", "rating", { unique: false })
          reviewsStore.createIndex("date", "date", { unique: false })
          reviewsStore.createIndex("username", "username", { unique: false })
        }
  
        // Bookings store - for event bookings
        if (!db.objectStoreNames.contains("bookings")) {
          const bookingsStore = db.createObjectStore("bookings", { keyPath: "id", autoIncrement: true })
          bookingsStore.createIndex("eventDate", "eventDate", { unique: false })
          bookingsStore.createIndex("eventType", "eventType", { unique: false })
          bookingsStore.createIndex("package", "package", { unique: false })
          bookingsStore.createIndex("status", "status", { unique: false })
          bookingsStore.createIndex("createdAt", "createdAt", { unique: false })
        }
      }
  
      request.onerror = (event) => {
        reject("Database error: " + event.target.errorCode)
      }
  
      request.onsuccess = (event) => {
        const db = event.target.result
        resolve(db)
      }
    })
  }
  
  // USER MANAGEMENT FUNCTIONS
  
  // Register a new admin user
  function registerUser(username, email, password) {
    return new Promise((resolve, reject) => {
      // In a real app, NEVER store passwords in plain text
      // This is a simplified example - use proper password hashing in production
      const hashedPassword = hashPassword(password)
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("users", "readwrite")
          const store = transaction.objectStore("users")
  
          // Check if user already exists
          const getRequest = store.get(username)
  
          getRequest.onsuccess = (event) => {
            if (event.target.result) {
              reject("Username already exists")
              return
            }
  
            // Add new user
            const user = {
              username: username,
              email: email,
              password: hashedPassword,
              isAdmin: true,
              role: "editor", // Default role
              createdAt: new Date(),
            }
  
            const addRequest = store.add(user)
  
            addRequest.onsuccess = () => {
              resolve("User registered successfully")
            }
  
            addRequest.onerror = (event) => {
              reject("Error registering user: " + event.target.error)
            }
          }
  
          getRequest.onerror = (event) => {
            reject("Error checking username: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Login function
  function loginUser(username, password) {
    return new Promise((resolve, reject) => {
      const hashedPassword = hashPassword(password)
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("users", "readonly")
          const store = transaction.objectStore("users")
          const request = store.get(username)
  
          request.onsuccess = (event) => {
            const user = event.target.result
            if (!user) {
              reject("User not found")
              return
            }
  
            if (user.password === hashedPassword) {
              // Don't send password back to UI
              const { password, ...userWithoutPassword } = user
              resolve(userWithoutPassword)
            } else {
              reject("Incorrect password")
            }
          }
  
          request.onerror = (event) => {
            reject("Login error: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Create a new admin user (for super admins only)
  function createAdminUser(name, username, email, password, role) {
    return new Promise((resolve, reject) => {
      // Check if current user is super admin
      if (!sessionStore.isSuperAdmin()) {
        reject("Only super admins can create new admin users")
        return
      }
  
      const hashedPassword = hashPassword(password)
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("users", "readwrite")
          const store = transaction.objectStore("users")
  
          // Check if user already exists
          const getRequest = store.get(username)
  
          getRequest.onsuccess = (event) => {
            if (event.target.result) {
              reject("Username already exists")
              return
            }
  
            // Add new user
            const user = {
              name: name,
              username: username,
              email: email,
              password: hashedPassword,
              isAdmin: true,
              role: role || "editor",
              createdAt: new Date(),
            }
  
            const addRequest = store.add(user)
  
            addRequest.onsuccess = () => {
              resolve("Admin user created successfully")
            }
  
            addRequest.onerror = (event) => {
              reject("Error creating admin user: " + event.target.error)
            }
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Get all admin users
  function getAllAdminUsers() {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("users", "readonly")
          const store = transaction.objectStore("users")
          const request = store.getAll()
  
          request.onsuccess = (event) => {
            // Don't return passwords
            const users = event.target.result.map((user) => {
              const { password, ...userWithoutPassword } = user
              return userWithoutPassword
            })
            resolve(users)
          }
  
          request.onerror = (event) => {
            reject("Error getting admin users: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Delete an admin user
  function deleteAdminUser(username) {
    return new Promise((resolve, reject) => {
      // Check if current user is super admin
      if (!sessionStore.isSuperAdmin()) {
        reject("Only super admins can delete admin users")
        return
      }
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("users", "readwrite")
          const store = transaction.objectStore("users")
          const request = store.delete(username)
  
          request.onsuccess = () => {
            resolve("Admin user deleted successfully")
          }
  
          request.onerror = (event) => {
            reject("Error deleting admin user: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // MEDIA MANAGEMENT FUNCTIONS
  
  // Upload photo or video
  function uploadMedia(file, username, title, description, category) {
    return new Promise((resolve, reject) => {
      // Check if user is logged in as admin
      if (!sessionStore.isAdmin()) {
        reject("Only admins can upload media")
        return
      }
  
      // Convert file to base64 for storage
      const reader = new FileReader()
  
      reader.onload = (event) => {
        const fileData = event.target.result
        const fileType = file.type.startsWith("image/") ? "photo" : "video"
  
        initDatabase()
          .then((db) => {
            const transaction = db.transaction("media", "readwrite")
            const store = transaction.objectStore("media")
  
            const media = {
              title: title,
              description: description,
              type: fileType,
              category: category || "other",
              data: fileData,
              filename: file.name,
              fileType: file.type,
              uploadDate: new Date(),
              username: username,
            }
  
            const request = store.add(media)
  
            request.onsuccess = (event) => {
              resolve({
                id: event.target.result,
                title: title,
                type: fileType,
                category: category,
                uploadDate: new Date(),
              })
            }
  
            request.onerror = (event) => {
              reject("Error uploading file: " + event.target.error)
            }
          })
          .catch((error) => reject(error))
      }
  
      reader.onerror = () => {
        reject("Error reading file")
      }
  
      reader.readAsDataURL(file)
    })
  }
  
  // Get all media files
  function getAllMedia() {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("media", "readonly")
          const store = transaction.objectStore("media")
          const request = store.getAll()
  
          request.onsuccess = (event) => {
            // Return media without the actual data to avoid large transfers
            const media = event.target.result.map((item) => {
              const { data, ...mediaWithoutData } = item
              return mediaWithoutData
            })
            resolve(media)
          }
  
          request.onerror = (event) => {
            reject("Error getting media: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Get media by type (photos or videos)
  function getMediaByType(type) {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("media", "readonly")
          const store = transaction.objectStore("media")
          const index = store.index("type")
          const request = index.getAll(type)
  
          request.onsuccess = (event) => {
            // Return media without the actual data to avoid large transfers
            const media = event.target.result.map((item) => {
              const { data, ...mediaWithoutData } = item
              return mediaWithoutData
            })
            resolve(media)
          }
  
          request.onerror = (event) => {
            reject("Error getting media: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Get a specific media file by ID
  function getMediaById(id) {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("media", "readonly")
          const store = transaction.objectStore("media")
          const request = store.get(id)
  
          request.onsuccess = (event) => {
            resolve(event.target.result)
          }
  
          request.onerror = (event) => {
            reject("Error getting media: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Delete media by ID
  function deleteMedia(id) {
    return new Promise((resolve, reject) => {
      // Check if user is logged in as admin
      if (!sessionStore.isAdmin()) {
        reject("Only admins can delete media")
        return
      }
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("media", "readwrite")
          const store = transaction.objectStore("media")
          const request = store.delete(id)
  
          request.onsuccess = () => {
            resolve("Media deleted successfully")
          }
  
          request.onerror = (event) => {
            reject("Error deleting media: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // REVIEW FUNCTIONS
  
  // Add a customer review
  function addReview(username, email, rating, comment) {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("reviews", "readwrite")
          const store = transaction.objectStore("reviews")
  
          const review = {
            username: username,
            email: email,
            rating: rating,
            comment: comment,
            date: new Date(),
            // No approval field - all reviews are automatically approved
          }
  
          const request = store.add(review)
  
          request.onsuccess = (event) => {
            resolve({
              id: event.target.result,
              ...review,
            })
          }
  
          request.onerror = (event) => {
            reject("Error adding review: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Get all reviews
  function getAllReviews() {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("reviews", "readonly")
          const store = transaction.objectStore("reviews")
          const request = store.getAll()
  
          request.onsuccess = (event) => {
            // Return all reviews - no filtering based on approval status
            const reviews = event.target.result
            resolve(reviews)
          }
  
          request.onerror = (event) => {
            reject("Error getting reviews: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Delete a review
  function deleteReview(id) {
    return new Promise((resolve, reject) => {
      // Check if user is logged in as admin
      if (!sessionStore.isAdmin()) {
        reject("Only admins can delete reviews")
        return
      }
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("reviews", "readwrite")
          const store = transaction.objectStore("reviews")
          const request = store.delete(id)
  
          request.onsuccess = () => {
            resolve("Review deleted successfully")
          }
  
          request.onerror = (event) => {
            reject("Error deleting review: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // BOOKING FUNCTIONS
  
  // Add a new booking
  function addBooking(name, email, phone, eventDate, eventType, packageType, message) {
    return new Promise((resolve, reject) => {
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("bookings", "readwrite")
          const store = transaction.objectStore("bookings")
  
          const booking = {
            name: name,
            email: email,
            phone: phone,
            eventDate: eventDate,
            eventType: eventType,
            package: packageType,
            message: message,
            status: "pending", // pending, confirmed, completed, cancelled
            createdAt: new Date(),
          }
  
          const request = store.add(booking)
  
          request.onsuccess = (event) => {
            resolve({
              id: event.target.result,
              ...booking,
            })
          }
  
          request.onerror = (event) => {
            reject("Error adding booking: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Get all bookings
  function getAllBookings() {
    return new Promise((resolve, reject) => {
      // Check if user is logged in as admin
      if (!sessionStore.isAdmin()) {
        reject("Only admins can view all bookings")
        return
      }
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("bookings", "readonly")
          const store = transaction.objectStore("bookings")
          const request = store.getAll()
  
          request.onsuccess = (event) => {
            resolve(event.target.result)
          }
  
          request.onerror = (event) => {
            reject("Error getting bookings: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Update booking status
  function updateBookingStatus(id, status) {
    return new Promise((resolve, reject) => {
      // Check if user is logged in as admin
      if (!sessionStore.isAdmin()) {
        reject("Only admins can update booking status")
        return
      }
  
      initDatabase()
        .then((db) => {
          const transaction = db.transaction("bookings", "readwrite")
          const store = transaction.objectStore("bookings")
          const request = store.get(id)
  
          request.onsuccess = (event) => {
            const booking = event.target.result
            if (!booking) {
              reject("Booking not found")
              return
            }
  
            booking.status = status
  
            const updateRequest = store.put(booking)
  
            updateRequest.onsuccess = () => {
              resolve("Booking status updated successfully")
            }
  
            updateRequest.onerror = (event) => {
              reject("Error updating booking status: " + event.target.error)
            }
          }
  
          request.onerror = (event) => {
            reject("Error getting booking: " + event.target.error)
          }
        })
        .catch((error) => reject(error))
    })
  }
  
  // Utility function for password hashing (DEMO ONLY - use bcrypt or similar in production)
  function hashPassword(password) {
    // This is a simple hash for demonstration purposes only
    // In a real application, use a proper hashing library
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }
  
  // Create an in-memory session store
  const sessionStore = {
    currentUser: null,
  
    setUser(user) {
      this.currentUser = user
      localStorage.setItem("currentUser", JSON.stringify(user))
    },
  
    getUser() {
      if (!this.currentUser) {
        const storedUser = localStorage.getItem("currentUser")
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser)
        }
      }
      return this.currentUser
    },
  
    clearUser() {
      this.currentUser = null
      localStorage.removeItem("currentUser")
    },
  
    isLoggedIn() {
      return this.getUser() !== null
    },
  
    isAdmin() {
      const user = this.getUser()
      return user && user.isAdmin === true
    },
  
    isSuperAdmin() {
      const user = this.getUser()
      return user && user.role === "super"
    },
  }
  
  // Export the API
  const RosariansDatabase = {
    // User management
    registerUser,
    loginUser,
    createAdminUser,
    getAllAdminUsers,
    deleteAdminUser,
  
    // Media management
    uploadMedia,
    getAllMedia,
    getMediaByType,
    getMediaById,
    deleteMedia,
  
    // Review management
    addReview,
    getAllReviews,
    deleteReview,
  
    // Booking management
    addBooking,
    getAllBookings,
    updateBookingStatus,
  
    // Session management
    session: sessionStore,
  }
  
  // Initialize the database with default super admin user
  initDatabase()
    .then((db) => {
      const transaction = db.transaction("users", "readwrite")
      const store = transaction.objectStore("users")
  
      // Check if super admin exists
      const request = store.get("admin")
  
      request.onsuccess = (event) => {
        if (!event.target.result) {
          // Create default super admin
          const superAdmin = {
            name: "Super Admin",
            username: "admin",
            email: "admin@rosarians.com",
            password: hashPassword("password"),
            isAdmin: true,
            role: "super",
            createdAt: new Date(),
          }
  
          store.add(superAdmin)
          console.log("Default super admin created")
        }
      }
    })
    .catch((error) => {
      console.error("Error initializing database:", error)
    })
  
  // Make the database accessible globally
  window.RosariansDatabase = RosariansDatabase
  
  