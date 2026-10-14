<?php
/**
 * The Athenaeum Library Management System
 * Database Configuration & Core Utility Helpers
 * PHP 8+ with PDO Prepared Statements
 */

// Report errors in logs but do not leak raw warnings to JSON output
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Start secure session if not already active
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400, // 24 hours
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true if on HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Database Credentials
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'library_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Default circulation rules
define('DEFAULT_LOAN_DAYS', 14);
define('DAILY_FINE_RATE', 2.00); // Rs. 2 per day overdue

/**
 * Get PDO Database Connection
 * @return PDO
 */
function get_db_connection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed: ' . $e->getMessage(),
                'hint'    => 'Ensure MySQL is running on XAMPP and database.sql has been imported into library_db.'
            ]);
            exit;
        }
    }
    return $pdo;
}

/**
 * Emit JSON response and terminate
 */
function json_response(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Emit JSON error response and terminate
 */
function json_error(string $message, int $status = 400, array $extra = []): void {
    json_response(array_merge([
        'success' => false,
        'error'   => $message
    ], $extra), $status);
}

/**
 * Parse incoming JSON payload or fallback to $_POST
 */
function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
    }
    return is_array($_POST) ? $_POST : [];
}

/**
 * Check if current user is logged in as librarian
 */
function is_librarian_authenticated(): bool {
    return !empty($_SESSION['librarian_id']) && !empty($_SESSION['librarian_user']);
}

/**
 * Enforce librarian authentication; halts with 401 if unauthenticated
 */
function require_librarian(): void {
    if (!is_librarian_authenticated()) {
        json_error('Access restricted to authenticated librarians. Please log in at the Librarian Desk.', 401);
    }
}
