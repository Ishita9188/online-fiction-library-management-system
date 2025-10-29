import mysql from 'mysql2';
import http from 'http';
import qs from 'querystring';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
let currentUserEmail = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'mydbIC0919_PH',
    database: 'FictionReads'
});
db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});
const server = http.createServer((req, res) => {
    console.log("Request received:", req.method, req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;
        if (req.method === 'POST' && req.url === '/signup') {
            const { name, email } = qs.parse(body);
            console.log("Signup Data:", name, email);
            const checkQuery = "SELECT * FROM users WHERE Email = ?";
            db.query(checkQuery, [email], (err, results) => {
                if (err) {
                    console.log('Database error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Database error' }));
                    return;
                }
                if (results.length > 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User already registered with this email' }));
                } else {
                    const insertQuery = "INSERT INTO users (Name, Email) VALUES (?, ?)";
                    currentUserEmail = email; 
                    db.query(insertQuery, [name, email], (err, result) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Error saving user' }));
                        } else {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ redirect: '/Books.html' }));
                        }
                    });
                }
            });
        } else if (req.method === 'POST' && req.url === '/login') {
            const { name, email } = qs.parse(body);
            const query = "SELECT * FROM users WHERE Name = ? AND Email = ?";
            db.query(query, [name, email], (err, results) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Database error');
                    return;
                }

                if (results.length > 0) {
                    currentUserEmail = email; 
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ redirect: '/Books.html' }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid login credentials' }));
                }
            });
        }
        else if (req.method === 'POST' && pathname === '/submit-review') {
            const { name, email, title, rating, review } = qs.parse(body);
        
            const insertReviewQuery = `
                INSERT INTO reviews (name, email, title, rating, review_text)
                VALUES (?, ?, ?, ?, ?)
            `;
            db.query(insertReviewQuery, [name, email, title, rating, review], (err, result) => {
                if (err) {
                    console.error('Error saving review:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save review' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Review submitted successfully', redirect: '/Books.html' }));
                }
            });
        }
        else if (req.method === 'POST' && pathname === '/submit-contact') {
            const formData = qs.parse(body);
            const { subject, firstname, email, confirm_email, message } = formData;
        
            const sql = `
                INSERT INTO contactMessages (subject, firstname, email, confirm_email, message)
                VALUES (?, ?, ?, ?, ?)
            `;
        
            db.query(sql, [subject, firstname, email, confirm_email, message], (err, result) => {
                if (err) {
                    console.error("DB Error:", err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end("Failed to store message");
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end("Message stored successfully");
                }
            });
        }
        
        else if (req.method === 'GET') {
                    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
                    const pathname = parsedUrl.pathname;
                    const email = parsedUrl.searchParams.get("email");
                    if (pathname === '/contact') {
                        const filePath = path.join(__dirname, 'OnlineFictionLibrary', 'ContactUs.html');
                        fs.readFile(filePath, 'utf-8', (err, data) => {
                            if (err) {
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                res.end('Error loading contact page');
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(data);
                            }
                        });
                        return;
                    }
                    
                    if (pathname === '/review.html' && email) {
                        const userQuery = "SELECT * FROM users WHERE Email = ?";
                        db.query(userQuery, [email], (err, results) => {
                            if (err || results.length === 0) {
                                res.writeHead(404, { 'Content-Type': 'text/plain' });
                                res.end('User not found');
                                return;
                            }
                            const user = results[0];
                            const filePath = path.join(__dirname, 'OnlineFictionLibrary', 'review.html');
                            fs.readFile(filePath, 'utf-8', (err, data) => {
                                if (err) {
                                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                                    res.end('Server Error');
                                } else {
                                    const html = data.replace('{{name}}', user.Name).replace('{{email}}', user.Email);
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end(html);
                                }
                            });
                        });
                        return;
                    }
                    if (pathname === '/user') {
                        if (!currentUserEmail) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'User not logged in' }));
                            return;
                        }
                    
                        const userQuery = "SELECT * FROM users WHERE Email = ?";
                        db.query(userQuery, [currentUserEmail], (err, results) => {
                            if (err || results.length === 0) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'User not found' }));
                            } else {
                                const user = results[0];
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ name: user.Name, email: user.Email }));
                            }
                        });
                        return;
                    }
                    const requestedPath = decodeURIComponent(pathname);
                    const filePath = path.join(__dirname, 'OnlineFictionLibrary', requestedPath === '/' ? 'Signup.html' : requestedPath);
                    const ext = path.extname(filePath).toLowerCase();
        
                    const contentTypes = {
                        '.html': 'text/html',
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                        '.pdf': 'application/pdf',
                        '.txt': 'text/plain',
                    };
        
                    fs.readFile(filePath, (err, data) => {
                        if (err) {
                            console.log('Error reading file:', err);
                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('Page not found');
                        } else {
                            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
                            res.end(data);
                        }
                    });
                } 
       else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        } 
    });
});
server.listen(3000, () => {
    console.log('Server running on port 3000');
});