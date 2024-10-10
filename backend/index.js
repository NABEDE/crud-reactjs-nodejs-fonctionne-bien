const express = require('express');
const bodyParser = require('body-parser');
const userController = require('./controllers/userController');
const auth = require('./middleware/auth');
const db = require('./config/db');
const multer = require('multer');
const path = require('path');
const cors = require("cors");
const fs = require('fs'); // pour supprimer les anciennes images

const dotenv = require('dotenv');

dotenv.config();

const upload = multer({ dest: 'uploads/' });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour parser le JSON et les données encodées dans l'URL
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Dossier pour servir les images

// Configurer multer pour le téléchargement d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renomme le fichier pour éviter les collisions
  },
});

app.post('/register', userController.register);
app.post('/login', userController.login);

// Protected route example
app.get('/protected', auth, (req, res) => {
    res.json({ message: 'This is a protected route' });
});

// Route protégée pour créer un item avec JWT
app.post('/create', auth, upload.single('image'), (req, res) => {
    const { title, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!image) {
        return res.status(400).json({ message: 'Image is required' });
    }

    const sql = 'INSERT INTO posts (title, body, image) VALUES (?, ?, ?)';
    const values = [title, description, image];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting item into database:', err);
            return res.status(500).json({ message: 'Server error' });
        }

        // Générer un token JWT avec l'ID de l'item créé
        const token = generateToken({ itemId: result.insertId });

        console.log('Item created successfully:', result);
        res.status(201).json({ message: 'Item created successfully', itemId: result.insertId, token });
    });
});

// Route pour récupérer toutes les tâches (protégée par JWT)
app.get("/", auth, (req, res) => {
    const sql = "SELECT * FROM posts";
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });

// Route pour récupérer un item par ID (protégée par JWT)
app.get('/item/:id', auth, (req, res) => {
    const itemId = req.params.id;
  
    const sql = 'SELECT * FROM posts WHERE id = ?';
    db.query(sql, [itemId], (err, result) => {
      if (err) {
        console.error('Error retrieving item from database:', err);
        return res.status(500).json({ message: 'Server error' });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }
  
      res.json(result[0]);
    });
  });

// Route pour mettre à jour un item par ID (protégée par JWT)
app.put('/item/:id', auth, upload.single('image'), (req, res) => {
    const itemId = req.params.id;
    const { title, body } = req.body;
  
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  
    const sql = 'UPDATE posts SET title = ?, body = ?, image = ? WHERE id = ?';
    const values = [title, body, imagePath, itemId];
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating item in database:', err);
        return res.status(500).json({ message: 'Server error' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }
  
      res.status(200).json({ message: 'Item updated successfully' });
    });
  });

  // Route pour mettre à jour l'image d'une tâche (protégée par JWT)
app.post('/update-image/:id', auth, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
  
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  
    const query = 'UPDATE posts SET image = ? WHERE id = ?';
    db.query(query, [image, id], (err, result) => {
      if (err) {
        console.error('Error updating image in database:', err);
        return res.status(500).json({ message: 'Server error' });
      }
  
      res.json({ message: 'Image updated successfully', task: { id, image } });
    });
  });



const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
