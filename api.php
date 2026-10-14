<?php
/**
 * The Athenaeum Library Management System
 * Unified JSON API Endpoint
 * Handles Circulation, Catalogue, Members, Dashboard Analytics, Auth,
 * NCERT / UP Board Curriculum (LKG to 12th), and Reading Desk Token System
 */

require_once __DIR__ . '/config.php';

$pdo = get_db_connection();
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$input = get_json_input();

if (empty($action) && !empty($input['action'])) {
    $action = $input['action'];
}

switch ($action) {

    // ========================================================================
    // AUTHENTICATION ENDPOINTS
    // ========================================================================

    case 'check_auth':
        json_response([
            'success'       => true,
            'authenticated' => is_librarian_authenticated(),
            'username'      => $_SESSION['librarian_user'] ?? null
        ]);
        break;

    case 'login':
        $username = trim($input['username'] ?? '');
        $password = trim($input['password'] ?? '');

        if ($username === '' || $password === '') {
            json_error('Please enter both librarian username and password.');
        }

        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM librarians WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $librarian = $stmt->fetch();

        if (!$librarian || !password_verify($password, $librarian['password_hash'])) {
            json_error('Invalid librarian credentials. Please check your username and key.');
        }

        $_SESSION['librarian_id']   = (int)$librarian['id'];
        $_SESSION['librarian_user'] = $librarian['username'];

        json_response([
            'success'  => true,
            'message'  => 'Welcome back to the Librarian Desk, ' . htmlspecialchars($librarian['username']) . '.',
            'username' => $librarian['username']
        ]);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
        json_response([
            'success' => true,
            'message' => 'Librarian shift logged out safely.'
        ]);
        break;

    // ========================================================================
    // DASHBOARD & ANALYTICS STATS
    // ========================================================================

    case 'stats':
        $countsStmt = $pdo->query('
            SELECT 
                (SELECT COUNT(*) FROM books) AS total_titles,
                (SELECT COALESCE(SUM(quantity), 0) FROM books) AS total_copies,
                (SELECT COALESCE(SUM(available), 0) FROM books) AS available_copies,
                (SELECT COUNT(*) FROM students) AS total_students,
                (SELECT COUNT(*) FROM issues WHERE return_date IS NULL) AS total_issued,
                (SELECT COUNT(*) FROM issues WHERE return_date IS NULL AND due_date < CURRENT_DATE) AS total_overdue,
                (SELECT COALESCE(SUM(fine), 0) FROM issues WHERE return_date IS NOT NULL) AS fines_collected,
                (SELECT COUNT(*) FROM reservations WHERE status = "active") AS active_reservations,
                (SELECT COUNT(*) FROM reading_tokens WHERE status = "active") AS active_tokens
        ');
        $stats = $countsStmt->fetch();

        $pendingFineStmt = $pdo->query('
            SELECT COALESCE(SUM(GREATEST(0, DATEDIFF(CURRENT_DATE, due_date)) * ' . DAILY_FINE_RATE . '), 0) AS pending_fines
            FROM issues
            WHERE return_date IS NULL AND due_date < CURRENT_DATE
        ');
        $stats['pending_fines'] = (float)$pendingFineStmt->fetchColumn();

        // Monthly circulation breakdown
        $chartStmt = $pdo->query("
            SELECT 
                DATE_FORMAT(issue_date, '%Y-%m') AS ym,
                DATE_FORMAT(issue_date, '%b %Y') AS month_label,
                COUNT(*) AS issue_count
            FROM issues
            WHERE issue_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
            GROUP BY ym, month_label
            ORDER BY ym ASC
        ");
        $monthlyIssues = $chartStmt->fetchAll();

        // Top 5 most borrowed books
        $topBooksStmt = $pdo->query('
            SELECT 
                b.id, b.title, b.author, b.isbn, b.category, b.class_grade, b.board, b.cover_url, b.shelf_no,
                COUNT(i.id) AS borrow_count
            FROM books b
            LEFT JOIN issues i ON b.id = i.book_id
            GROUP BY b.id, b.title, b.author, b.isbn, b.category, b.class_grade, b.board, b.cover_url, b.shelf_no
            ORDER BY borrow_count DESC, b.title ASC
            LIMIT 5
        ');
        $topBooks = $topBooksStmt->fetchAll();

        // Newest arrivals
        $recentBooksStmt = $pdo->query('
            SELECT id, title, author, isbn, category, class_grade, board, quantity, available, cover_url, shelf_no, created_at
            FROM books
            ORDER BY id DESC
            LIMIT 8
        ');
        $newArrivals = $recentBooksStmt->fetchAll();

        // Recent circulation activity log
        $recentIssuesStmt = $pdo->query('
            SELECT 
                i.id, i.issue_date, i.due_date, i.return_date, i.fine,
                b.title AS book_title, b.shelf_no,
                s.name AS student_name, s.roll_no, s.member_id,
                CASE 
                    WHEN i.return_date IS NOT NULL THEN "returned"
                    WHEN i.due_date < CURRENT_DATE THEN "overdue"
                    ELSE "active"
                END AS status
            FROM issues i
            JOIN books b ON i.book_id = b.id
            JOIN students s ON i.student_id = s.id
            ORDER BY i.id DESC
            LIMIT 8
        ');
        $recentActivity = $recentIssuesStmt->fetchAll();

        // Currently occupied reading desks
        $activeDesksStmt = $pdo->query('
            SELECT 
                t.id, t.token_number, t.token_code, t.desk_number, t.issued_at,
                s.name AS student_name, s.member_id, s.roll_no,
                b.id AS book_id, b.title AS book_title, b.class_grade, b.subject, b.shelf_no,
                TIMESTAMPDIFF(MINUTE, t.issued_at, NOW()) AS reading_minutes
            FROM reading_tokens t
            JOIN students s ON t.student_id = s.id
            JOIN books b ON t.book_id = b.id
            WHERE t.status = "active"
            ORDER BY t.id DESC
        ');
        $activeDesks = $activeDesksStmt->fetchAll();

        // Curated shelf collections for grand bookcase tiers
        $shelfPrimaryStmt = $pdo->query('
            SELECT id, title, author, isbn, category, class_grade, board, subject, quantity, available, shelf_no
            FROM books
            WHERE class_grade IN ("LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8")
            ORDER BY FIELD(class_grade, "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"), id ASC
            LIMIT 24
        ');
        $shelfPrimary = $shelfPrimaryStmt->fetchAll();

        $shelfSecondaryStmt = $pdo->query('
            SELECT id, title, author, isbn, category, class_grade, board, subject, quantity, available, shelf_no
            FROM books
            WHERE class_grade IN ("Class 9", "Class 10", "Class 11", "Class 12", "Class 11 & 12")
            ORDER BY FIELD(class_grade, "Class 9", "Class 10", "Class 11", "Class 12", "Class 11 & 12"), id ASC
            LIMIT 26
        ');
        $shelfSecondary = $shelfSecondaryStmt->fetchAll();

        json_response([
            'success'         => true,
            'summary'         => $stats,
            'monthly_issues'  => $monthlyIssues,
            'top_books'       => $topBooks,
            'new_arrivals'    => $newArrivals,
            'recent_issues'   => $recentActivity,
            'active_desks'    => $activeDesks,
            'shelf_primary'   => $shelfPrimary,
            'shelf_secondary' => $shelfSecondary
        ]);
        break;

    // ========================================================================
    // BOOKS & CATALOGUE ENDPOINTS (WITH NCERT & UP BOARD FILTERS)
    // ========================================================================

    case 'books':
        $search   = trim($_GET['search'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $class    = trim($_GET['class_grade'] ?? '');
        $board    = trim($_GET['board'] ?? '');
        $subject  = trim($_GET['subject'] ?? '');
        $avail    = trim($_GET['availability'] ?? 'all');
        $sort     = trim($_GET['sort'] ?? 'title_asc');

        $sql = 'SELECT id, title, author, isbn, category, class_grade, board, medium, subject, quantity, available, cover_url, shelf_no, description, pdf_preview_url, created_at FROM books WHERE 1=1';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ? OR class_grade LIKE ? OR board LIKE ? OR subject LIKE ? OR shelf_no LIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
        }

        if ($category !== '' && $category !== 'All') {
            $sql .= ' AND category = ?';
            $params[] = $category;
        }

        if ($class !== '' && $class !== 'All') {
            $sql .= ' AND class_grade = ?';
            $params[] = $class;
        }

        if ($board !== '' && $board !== 'All') {
            $sql .= ' AND board LIKE ?';
            $params[] = '%' . $board . '%';
        }

        if ($subject !== '' && $subject !== 'All') {
            $sql .= ' AND subject LIKE ?';
            $params[] = '%' . $subject . '%';
        }

        if ($avail === 'available') {
            $sql .= ' AND available > 0';
        } elseif ($avail === 'unavailable') {
            $sql .= ' AND available = 0';
        }

        switch ($sort) {
            case 'title_desc':
                $sql .= ' ORDER BY title DESC';
                break;
            case 'author':
                $sql .= ' ORDER BY author ASC, title ASC';
                break;
            case 'newest':
                $sql .= ' ORDER BY id DESC';
                break;
            case 'shelf':
                $sql .= ' ORDER BY shelf_no ASC';
                break;
            case 'class':
                $sql .= ' ORDER BY FIELD(class_grade, "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Class 11 & 12", "College / Senior", "Senior Secondary", "General"), title ASC';
                break;
            case 'title_asc':
            default:
                $sql .= ' ORDER BY title ASC';
                break;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $books = $stmt->fetchAll();

        // Distinct categories
        $catStmt = $pdo->query('SELECT DISTINCT category FROM books WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
        $categories = $catStmt->fetchAll(PDO::FETCH_COLUMN);

        // Distinct classes
        $classStmt = $pdo->query('
            SELECT DISTINCT class_grade FROM books 
            WHERE class_grade IS NOT NULL AND class_grade != "" 
            ORDER BY FIELD(class_grade, "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Class 11 & 12", "College / Senior", "Senior Secondary", "General")
        ');
        $classes = $classStmt->fetchAll(PDO::FETCH_COLUMN);

        // Distinct subjects
        $subStmt = $pdo->query('SELECT DISTINCT subject FROM books WHERE subject IS NOT NULL AND subject != "" ORDER BY subject ASC');
        $subjects = $subStmt->fetchAll(PDO::FETCH_COLUMN);

        json_response([
            'success'    => true,
            'count'      => count($books),
            'books'      => $books,
            'categories' => $categories,
            'classes'    => $classes,
            'subjects'   => $subjects
        ]);
        break;

    case 'book_details':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid book ID specified.');
        }

        $stmt = $pdo->prepare('SELECT * FROM books WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $book = $stmt->fetch();

        if (!$book) {
            json_error('Book not found in library catalogue.', 404);
        }

        // Active borrowers
        $borrowersStmt = $pdo->prepare('
            SELECT 
                i.id AS issue_id, i.issue_date, i.due_date,
                s.id AS student_id, s.name AS student_name, s.roll_no, s.member_id, s.email,
                GREATEST(0, DATEDIFF(CURRENT_DATE, i.due_date)) AS days_overdue,
                CASE WHEN i.due_date < CURRENT_DATE THEN 1 ELSE 0 END AS is_overdue
            FROM issues i
            JOIN students s ON i.student_id = s.id
            WHERE i.book_id = ? AND i.return_date IS NULL
            ORDER BY i.due_date ASC
        ');
        $borrowersStmt->execute([$id]);
        $borrowers = $borrowersStmt->fetchAll();

        // Active reservations
        $resStmt = $pdo->prepare('
            SELECT 
                r.id, r.reserved_on, r.status,
                s.name AS student_name, s.roll_no, s.member_id
            FROM reservations r
            JOIN students s ON r.student_id = s.id
            WHERE r.book_id = ? AND r.status = "active"
            ORDER BY r.reserved_on ASC
        ');
        $resStmt->execute([$id]);
        $reservations = $resStmt->fetchAll();

        // Active reading tokens for this book
        $tokenStmt = $pdo->prepare('
            SELECT 
                t.id, t.token_number, t.token_code, t.desk_number, t.issued_at,
                s.name AS student_name, s.roll_no, s.member_id,
                TIMESTAMPDIFF(MINUTE, t.issued_at, NOW()) AS reading_minutes
            FROM reading_tokens t
            JOIN students s ON t.student_id = s.id
            WHERE t.book_id = ? AND t.status = "active"
            ORDER BY t.issued_at DESC
        ');
        $tokenStmt->execute([$id]);
        $activeTokens = $tokenStmt->fetchAll();

        json_response([
            'success'       => true,
            'book'          => $book,
            'borrowers'     => $borrowers,
            'reservations'  => $reservations,
            'active_tokens' => $activeTokens
        ]);
        break;

    case 'save_book':
        require_librarian();

        $id          = !empty($input['id']) ? (int)$input['id'] : null;
        $title       = trim($input['title'] ?? '');
        $author      = trim($input['author'] ?? '');
        $isbn        = trim($input['isbn'] ?? '');
        $category    = trim($input['category'] ?? '');
        $class_grade = trim($input['class_grade'] ?? 'General');
        $board       = trim($input['board'] ?? 'NCERT / UP Board');
        $medium      = trim($input['medium'] ?? 'Hindi');
        $subject     = trim($input['subject'] ?? 'General');
        $quantity    = (int)($input['quantity'] ?? 1);
        $shelf_no    = trim($input['shelf_no'] ?? '');
        $cover_url   = trim($input['cover_url'] ?? '');
        $description = trim($input['description'] ?? '');
        $pdf_url     = trim($input['pdf_preview_url'] ?? '');

        if ($title === '' || $author === '' || $isbn === '' || $shelf_no === '') {
            json_error('Please fill in all required fields (Title, Author, ISBN, Shelf Number).');
        }

        if ($quantity < 1) {
            json_error('Total quantity must be at least 1 copy.');
        }

        $isbnSql = 'SELECT id FROM books WHERE isbn = ?' . ($id ? ' AND id != ?' : '') . ' LIMIT 1';
        $isbnStmt = $pdo->prepare($isbnSql);
        $isbnParams = $id ? [$isbn, $id] : [$isbn];
        $isbnStmt->execute($isbnParams);
        if ($isbnStmt->fetch()) {
            json_error('A book with ISBN ' . htmlspecialchars($isbn) . ' already exists in the catalogue.');
        }

        if ($id) {
            $borrowedStmt = $pdo->prepare('SELECT COUNT(*) FROM issues WHERE book_id = ? AND return_date IS NULL');
            $borrowedStmt->execute([$id]);
            $borrowedCount = (int)$borrowedStmt->fetchColumn();

            if ($quantity < $borrowedCount) {
                json_error("Cannot set total copies to {$quantity}. There are currently {$borrowedCount} copies on loan.");
            }

            $newAvailable = $quantity - $borrowedCount;

            $updateStmt = $pdo->prepare('
                UPDATE books 
                SET title = ?, author = ?, isbn = ?, category = ?, class_grade = ?, board = ?, medium = ?, subject = ?, quantity = ?, available = ?, shelf_no = ?, cover_url = ?, description = ?, pdf_preview_url = ?
                WHERE id = ?
            ');
            $updateStmt->execute([$title, $author, $isbn, $category, $class_grade, $board, $medium, $subject, $quantity, $newAvailable, $shelf_no, $cover_url, $description, $pdf_url, $id]);

            json_response([
                'success' => true,
                'message' => 'Textbook catalogue record updated successfully.',
                'book_id' => $id
            ]);
        } else {
            $insertStmt = $pdo->prepare('
                INSERT INTO books (title, author, isbn, category, class_grade, board, medium, subject, quantity, available, shelf_no, cover_url, description, pdf_preview_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $insertStmt->execute([$title, $author, $isbn, $category, $class_grade, $board, $medium, $subject, $quantity, $quantity, $shelf_no, $cover_url, $description, $pdf_url]);
            $newId = (int)$pdo->lastInsertId();

            json_response([
                'success' => true,
                'message' => 'New volume added to ' . htmlspecialchars($shelf_no) . '.',
                'book_id' => $newId
            ]);
        }
        break;

    case 'delete_book':
        require_librarian();

        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid book ID specified.');
        }

        $issueCountStmt = $pdo->prepare('SELECT COUNT(*) FROM issues WHERE book_id = ?');
        $issueCountStmt->execute([$id]);
        $issueCount = (int)$issueCountStmt->fetchColumn();

        if ($issueCount > 0) {
            json_error("Cannot purge this textbook because it has {$issueCount} historical circulation ledger records.");
        }

        $delRes = $pdo->prepare('DELETE FROM reservations WHERE book_id = ?');
        $delRes->execute([$id]);

        $delTokens = $pdo->prepare('DELETE FROM reading_tokens WHERE book_id = ?');
        $delTokens->execute([$id]);

        $delStmt = $pdo->prepare('DELETE FROM books WHERE id = ?');
        $delStmt->execute([$id]);

        json_response([
            'success' => true,
            'message' => 'Textbook removed from archive catalogue.'
        ]);
        break;

    // ========================================================================
    // READING DESK TOKEN SYSTEM (वाचनालय प्रवेश टोकन व्यवस्था)
    // ========================================================================

    case 'tokens':
        $status = trim($_GET['status'] ?? 'all');
        $search = trim($_GET['search'] ?? '');

        $sql = '
            SELECT 
                t.id, t.token_number, t.token_code, t.desk_number, t.issued_at, t.returned_at, t.status,
                TIMESTAMPDIFF(MINUTE, t.issued_at, COALESCE(t.returned_at, NOW())) AS duration_minutes,
                s.id AS student_id, s.name AS student_name, s.roll_no, s.member_id, s.phone,
                b.id AS book_id, b.title AS book_title, b.class_grade, b.board, b.subject, b.shelf_no, b.cover_url
            FROM reading_tokens t
            JOIN students s ON t.student_id = s.id
            JOIN books b ON t.book_id = b.id
            WHERE 1=1
        ';
        $params = [];

        if ($status === 'active') {
            $sql .= ' AND t.status = "active"';
        } elseif ($status === 'completed') {
            $sql .= ' AND t.status = "completed"';
        }

        if ($search !== '') {
            $sql .= ' AND (s.name LIKE ? OR s.member_id LIKE ? OR s.roll_no LIKE ? OR b.title LIKE ? OR t.token_code LIKE ? OR t.desk_number LIKE ?)';
            $term = '%' . $search . '%';
            $params = [$term, $term, $term, $term, $term, $term];
        }

        $sql .= ' ORDER BY t.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $tokens = $stmt->fetchAll();

        // Calculate available desks (out of 24 reading hall desks)
        $activeDesksStmt = $pdo->query('SELECT desk_number FROM reading_tokens WHERE status = "active"');
        $occupiedDesks = $activeDesksStmt->fetchAll(PDO::FETCH_COLUMN);

        json_response([
            'success'        => true,
            'count'          => count($tokens),
            'tokens'         => $tokens,
            'occupied_desks' => $occupiedDesks,
            'total_desks'    => 24
        ]);
        break;

    case 'issue_token':
        $book_id    = (int)($input['book_id'] ?? 0);
        $student_id = (int)($input['student_id'] ?? 0);
        $member_id  = trim($input['member_id'] ?? '');
        $desk_no    = trim($input['desk_number'] ?? '');

        if ($book_id <= 0) {
            json_error('Please select an NCERT / UP Board textbook for reading.');
        }

        // Find student if member_id given
        if ($student_id <= 0 && $member_id !== '') {
            $sStmt = $pdo->prepare('SELECT id, name FROM students WHERE member_id = ? OR roll_no = ? LIMIT 1');
            $sStmt->execute([$member_id, $member_id]);
            $foundStudent = $sStmt->fetch();
            if (!$foundStudent) {
                json_error('Member ID or Roll No "' . htmlspecialchars($member_id) . '" not found in scholar roll.');
            }
            $student_id = (int)$foundStudent['id'];
        }

        if ($student_id <= 0) {
            json_error('Please select or specify a registered scholar.');
        }

        // Check book
        $bStmt = $pdo->prepare('SELECT id, title, class_grade, board, subject, shelf_no, pdf_preview_url FROM books WHERE id = ? LIMIT 1');
        $bStmt->execute([$book_id]);
        $book = $bStmt->fetch();
        if (!$book) {
            json_error('Selected textbook not found in library.');
        }

        // Check student
        $stStmt = $pdo->prepare('SELECT id, name, roll_no, member_id FROM students WHERE id = ? LIMIT 1');
        $stStmt->execute([$student_id]);
        $student = $stStmt->fetch();
        if (!$student) {
            json_error('Scholar profile not found.');
        }

        // Check if student ALREADY has an active reading token
        $checkActive = $pdo->prepare('SELECT id, token_code, desk_number FROM reading_tokens WHERE student_id = ? AND status = "active" LIMIT 1');
        $checkActive->execute([$student_id]);
        $existing = $checkActive->fetch();
        if ($existing) {
            json_error("Scholar {$student['name']} already holds active Token {$existing['token_code']} at {$existing['desk_number']}. Please complete or release previous reading session first.");
        }

        // Auto-assign desk if not specified
        if ($desk_no === '') {
            $occupiedStmt = $pdo->query('SELECT desk_number FROM reading_tokens WHERE status = "active"');
            $occupied = $occupiedStmt->fetchAll(PDO::FETCH_COLUMN);

            $assignedDesk = null;
            for ($d = 1; $d <= 24; $d++) {
                $cand = 'Desk #' . str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                if (!in_array($cand, $occupied)) {
                    $assignedDesk = $cand;
                    break;
                }
            }
            if (!$assignedDesk) {
                $assignedDesk = 'Desk #' . rand(1, 24) . ' (Shared Hall)';
            }
            $desk_no = $assignedDesk;
        }

        // Next token number
        $maxToken = $pdo->query('SELECT COALESCE(MAX(token_number), 100) FROM reading_tokens')->fetchColumn();
        $tokenNumber = (int)$maxToken + 1;
        $tokenCode = 'TOK-' . date('Y') . '-' . str_pad((string)$tokenNumber, 3, '0', STR_PAD_LEFT);

        $insertToken = $pdo->prepare('
            INSERT INTO reading_tokens (token_number, token_code, student_id, book_id, desk_number, issued_at, status)
            VALUES (?, ?, ?, ?, ?, NOW(), "active")
        ');
        $insertToken->execute([$tokenNumber, $tokenCode, $student_id, $book_id, $desk_no]);
        $tokenId = (int)$pdo->lastInsertId();

        json_response([
            'success'      => true,
            'message'      => "Reading Token #{$tokenNumber} issued to {$student['name']}. Assigned {$desk_no}.",
            'token_id'     => $tokenId,
            'token_number' => $tokenNumber,
            'token_code'   => $tokenCode,
            'desk_number'  => $desk_no,
            'student_name' => $student['name'],
            'member_id'    => $student['member_id'],
            'roll_no'      => $student['roll_no'],
            'book_title'   => $book['title'],
            'class_grade'  => $book['class_grade'],
            'subject'      => $book['subject'],
            'shelf_no'     => $book['shelf_no'],
            'pdf_url'      => $book['pdf_preview_url'],
            'issued_at'    => date('Y-m-d H:i:s')
        ]);
        break;

    case 'return_token':
        $token_id = (int)($input['token_id'] ?? 0);
        if ($token_id <= 0) {
            json_error('Invalid reading token ID.');
        }

        $stmt = $pdo->prepare('
            SELECT t.*, s.name AS student_name, b.title AS book_title 
            FROM reading_tokens t
            JOIN students s ON t.student_id = s.id
            JOIN books b ON t.book_id = b.id
            WHERE t.id = ? LIMIT 1
        ');
        $stmt->execute([$token_id]);
        $tok = $stmt->fetch();

        if (!$tok) {
            json_error('Reading token not found.');
        }

        if ($tok['status'] === 'completed') {
            json_error('This reading desk session has already been completed.');
        }

        $upStmt = $pdo->prepare('UPDATE reading_tokens SET status = "completed", returned_at = NOW() WHERE id = ?');
        $upStmt->execute([$token_id]);

        json_response([
            'success'      => true,
            'message'      => "Reading Token {$tok['token_code']} completed. {$tok['desk_number']} is now vacant.",
            'token_code'   => $tok['token_code'],
            'desk_number'  => $tok['desk_number'],
            'student_name' => $tok['student_name']
        ]);
        break;

    case 'read_book_content':
        $id = (int)($_GET['id'] ?? $_GET['book_id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid book ID specified.');
        }

        $stmt = $pdo->prepare('SELECT * FROM books WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $book = $stmt->fetch();

        if (!$book) {
            json_error('Textbook not found in archives.', 404);
        }

        // Generate curriculum syllabus & chapter preview
        $chapters = [
            ['no' => 1, 'title' => 'प्रारंभिक अध्याय (Foundational Concepts & Principles)', 'pages' => '1 - 24', 'desc' => 'पाठ की मूल अवधारणाएं, प्रमुख परिभाषाएं और ऐतिहासिक संदर्भ।'],
            ['no' => 2, 'title' => 'मूल संकल्पनाएं एवं अभ्यास (Core Theory & Applications)', 'pages' => '25 - 58', 'desc' => 'विस्तृत उदाहरण, हल किए गए प्रश्न तथा बोर्ड परीक्षा में पूछे जाने वाले महत्वपूर्ण बिंदु।'],
            ['no' => 3, 'title' => 'क्रियाकलाप एवं प्रायोगिक कार्य (Practical Exercises & Formulae)', 'pages' => '59 - 94', 'desc' => 'कक्षा अभ्यास, सूत्र तालिका तथा वैचारिक प्रश्नों के समाधान।'],
            ['no' => 4, 'title' => 'अध्याय समीक्षा एवं बोर्ड प्रश्न (Exam Review & NCERT Questions)', 'pages' => '95 - 130', 'desc' => 'यूपी बोर्ड व सीबीएसई परीक्षाओं के विगत वर्षों के प्रश्न और उत्तरमाला।']
        ];

        json_response([
            'success'  => true,
            'book'     => $book,
            'chapters' => $chapters,
            'notice'   => 'NCERT / UPMSP आधिकारिक डिजिटल वाचनालय (Official Digital Reading Stacks).'
        ]);
        break;

    // ========================================================================
    // STUDENTS / MEMBERS ENDPOINTS
    // ========================================================================

    case 'students':
        $search = trim($_GET['search'] ?? '');

        $sql = '
            SELECT 
                s.id, s.name, s.roll_no, s.email, s.phone, s.member_id, s.created_at,
                (SELECT COUNT(*) FROM issues i WHERE i.student_id = s.id AND i.return_date IS NULL) AS active_loans,
                (SELECT COUNT(*) FROM issues i WHERE i.student_id = s.id AND i.return_date IS NULL AND i.due_date < CURRENT_DATE) AS overdue_loans,
                (SELECT COUNT(*) FROM reading_tokens t WHERE t.student_id = s.id AND t.status = "active") AS active_reading_tokens
            FROM students s
            WHERE 1=1
        ';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (s.name LIKE ? OR s.roll_no LIKE ? OR s.member_id LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)';
            $term = '%' . $search . '%';
            $params = [$term, $term, $term, $term, $term];
        }

        $sql .= ' ORDER BY s.name ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $students = $stmt->fetchAll();

        json_response([
            'success'  => true,
            'count'    => count($students),
            'students' => $students
        ]);
        break;

    case 'student_details':
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid student ID specified.');
        }

        $stmt = $pdo->prepare('SELECT * FROM students WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $student = $stmt->fetch();

        if (!$student) {
            json_error('Student member record not found.', 404);
        }

        // Loan history
        $historyStmt = $pdo->prepare('
            SELECT 
                i.id AS issue_id, i.issue_date, i.due_date, i.return_date, i.fine,
                b.id AS book_id, b.title AS book_title, b.author, b.isbn, b.shelf_no, b.cover_url,
                GREATEST(0, DATEDIFF(CURRENT_DATE, i.due_date)) AS days_overdue,
                CASE 
                    WHEN i.return_date IS NOT NULL THEN "returned"
                    WHEN i.due_date < CURRENT_DATE THEN "overdue"
                    ELSE "active"
                END AS status
            FROM issues i
            JOIN books b ON i.book_id = b.id
            WHERE i.student_id = ?
            ORDER BY i.id DESC
        ');
        $historyStmt->execute([$id]);
        $history = $historyStmt->fetchAll();

        // Reading hall token history
        $tokenHistStmt = $pdo->prepare('
            SELECT 
                t.id, t.token_number, t.token_code, t.desk_number, t.issued_at, t.returned_at, t.status,
                b.title AS book_title, b.class_grade, b.subject
            FROM reading_tokens t
            JOIN books b ON t.book_id = b.id
            WHERE t.student_id = ?
            ORDER BY t.id DESC
            LIMIT 10
        ');
        $tokenHistStmt->execute([$id]);
        $tokenHistory = $tokenHistStmt->fetchAll();

        $finesStmt = $pdo->prepare('SELECT COALESCE(SUM(fine), 0) FROM issues WHERE student_id = ? AND return_date IS NOT NULL');
        $finesStmt->execute([$id]);
        $finesPaid = (float)$finesStmt->fetchColumn();

        json_response([
            'success'       => true,
            'student'       => $student,
            'history'       => $history,
            'token_history' => $tokenHistory,
            'fines_paid'    => $finesPaid
        ]);
        break;

    case 'save_student':
        require_librarian();

        $id        = !empty($input['id']) ? (int)$input['id'] : null;
        $name      = trim($input['name'] ?? '');
        $roll_no   = trim($input['roll_no'] ?? '');
        $email     = trim($input['email'] ?? '');
        $phone     = trim($input['phone'] ?? '');
        $member_id = trim($input['member_id'] ?? '');

        if ($name === '' || $roll_no === '' || $email === '' || $phone === '') {
            json_error('Please complete all required fields (Name, Roll No, Email, Phone).');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_error('Please provide a valid email address.');
        }

        if ($member_id === '') {
            $member_id = 'LIB-' . date('Y') . '-' . str_pad((string)rand(100, 999), 3, '0', STR_PAD_LEFT);
        }

        $checkRoll = $pdo->prepare('SELECT id FROM students WHERE roll_no = ?' . ($id ? ' AND id != ?' : '') . ' LIMIT 1');
        $checkRoll->execute($id ? [$roll_no, $id] : [$roll_no]);
        if ($checkRoll->fetch()) {
            json_error('Roll Number ' . htmlspecialchars($roll_no) . ' is already registered.');
        }

        $checkMem = $pdo->prepare('SELECT id FROM students WHERE member_id = ?' . ($id ? ' AND id != ?' : '') . ' LIMIT 1');
        $checkMem->execute($id ? [$member_id, $id] : [$member_id]);
        if ($checkMem->fetch()) {
            json_error('Member ID ' . htmlspecialchars($member_id) . ' is already registered.');
        }

        if ($id) {
            $stmt = $pdo->prepare('UPDATE students SET name = ?, roll_no = ?, email = ?, phone = ?, member_id = ? WHERE id = ?');
            $stmt->execute([$name, $roll_no, $email, $phone, $member_id, $id]);
            json_response([
                'success'    => true,
                'message'    => 'Member card details updated successfully.',
                'student_id' => $id
            ]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO students (name, roll_no, email, phone, member_id) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$name, $roll_no, $email, $phone, $member_id]);
            $newId = (int)$pdo->lastInsertId();
            json_response([
                'success'    => true,
                'message'    => 'New library member registered! Member ID: ' . $member_id,
                'student_id' => $newId
            ]);
        }
        break;

    case 'delete_student':
        require_librarian();

        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            json_error('Invalid student ID.');
        }

        $activeStmt = $pdo->prepare('SELECT COUNT(*) FROM issues WHERE student_id = ? AND return_date IS NULL');
        $activeStmt->execute([$id]);
        $activeCount = (int)$activeStmt->fetchColumn();

        if ($activeCount > 0) {
            json_error("Cannot delete member: student currently holds {$activeCount} unreturned book(s).");
        }

        $pastStmt = $pdo->prepare('SELECT COUNT(*) FROM issues WHERE student_id = ?');
        $pastStmt->execute([$id]);
        $pastCount = (int)$pastStmt->fetchColumn();

        if ($pastCount > 0) {
            json_error("Cannot delete member because this student has {$pastCount} past circulation ledger entries.");
        }

        $del = $pdo->prepare('DELETE FROM students WHERE id = ?');
        $del->execute([$id]);

        json_response([
            'success' => true,
            'message' => 'Student member record removed.'
        ]);
        break;

    // ========================================================================
    // ISSUES & CIRCULATION ENDPOINTS (TRANSACTION SAFE)
    // ========================================================================

    case 'issues':
        $status = trim($_GET['status'] ?? 'all');
        $search = trim($_GET['search'] ?? '');

        $sql = '
            SELECT 
                i.id, i.book_id, i.student_id, i.issue_date, i.due_date, i.return_date, i.fine,
                b.title AS book_title, b.author AS book_author, b.isbn, b.shelf_no, b.cover_url, b.class_grade, b.board,
                s.name AS student_name, s.roll_no, s.member_id, s.phone, s.email,
                GREATEST(0, DATEDIFF(CURRENT_DATE, i.due_date)) AS overdue_days,
                CASE 
                    WHEN i.return_date IS NOT NULL THEN "returned"
                    WHEN i.due_date < CURRENT_DATE THEN "overdue"
                    ELSE "active"
                END AS computed_status,
                CASE 
                    WHEN i.return_date IS NOT NULL THEN i.fine
                    WHEN i.due_date < CURRENT_DATE THEN GREATEST(0, DATEDIFF(CURRENT_DATE, i.due_date)) * ' . DAILY_FINE_RATE . '
                    ELSE 0.00
                END AS computed_fine
            FROM issues i
            JOIN books b ON i.book_id = b.id
            JOIN students s ON i.student_id = s.id
            WHERE 1=1
        ';
        $params = [];

        if ($status === 'active') {
            $sql .= ' AND i.return_date IS NULL AND i.due_date >= CURRENT_DATE';
        } elseif ($status === 'overdue') {
            $sql .= ' AND i.return_date IS NULL AND i.due_date < CURRENT_DATE';
        } elseif ($status === 'returned') {
            $sql .= ' AND i.return_date IS NOT NULL';
        }

        if ($search !== '') {
            $sql .= ' AND (b.title LIKE ? OR b.isbn LIKE ? OR s.name LIKE ? OR s.roll_no LIKE ? OR s.member_id LIKE ?)';
            $term = '%' . $search . '%';
            $params = [$term, $term, $term, $term, $term];
        }

        $sql .= ' ORDER BY i.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $issues = $stmt->fetchAll();

        json_response([
            'success' => true,
            'count'   => count($issues),
            'issues'  => $issues
        ]);
        break;

    case 'issue_book':
        require_librarian();

        $book_id    = (int)($input['book_id'] ?? 0);
        $student_id = (int)($input['student_id'] ?? 0);
        $issue_days = (int)($input['days'] ?? DEFAULT_LOAN_DAYS);
        if ($issue_days < 1) $issue_days = DEFAULT_LOAN_DAYS;

        if ($book_id <= 0 || $student_id <= 0) {
            json_error('Please select both a valid textbook and a registered scholar.');
        }

        try {
            $pdo->beginTransaction();

            $bStmt = $pdo->prepare('SELECT id, title, available, quantity, shelf_no FROM books WHERE id = ? FOR UPDATE');
            $bStmt->execute([$book_id]);
            $book = $bStmt->fetch();

            if (!$book) {
                $pdo->rollBack();
                json_error('Selected textbook not found in catalogue.');
            }

            if ((int)$book['available'] <= 0) {
                $pdo->rollBack();
                json_error("All copies of \"{$book['title']}\" are currently on loan or in the reading hall. You may place a reservation or take a reading desk token.");
            }

            $sStmt = $pdo->prepare('SELECT id, name, roll_no, member_id FROM students WHERE id = ?');
            $sStmt->execute([$student_id]);
            $student = $sStmt->fetch();

            if (!$student) {
                $pdo->rollBack();
                json_error('Student member record not found.');
            }

            $duplicateStmt = $pdo->prepare('
                SELECT id FROM issues 
                WHERE book_id = ? AND student_id = ? AND return_date IS NULL
                LIMIT 1
            ');
            $duplicateStmt->execute([$book_id, $student_id]);
            if ($duplicateStmt->fetch()) {
                $pdo->rollBack();
                json_error("Scholar {$student['name']} already holds an unreturned copy of \"{$book['title']}\". Duplicate active loans of the same title are prohibited.");
            }

            $decStmt = $pdo->prepare('UPDATE books SET available = available - 1 WHERE id = ?');
            $decStmt->execute([$book_id]);

            $issueDate = date('Y-m-d');
            $dueDate   = date('Y-m-d', strtotime("+{$issue_days} days"));

            $issueInsert = $pdo->prepare('
                INSERT INTO issues (book_id, student_id, issue_date, due_date, return_date, fine)
                VALUES (?, ?, ?, ?, NULL, 0.00)
            ');
            $issueInsert->execute([$book_id, $student_id, $issueDate, $dueDate]);
            $newIssueId = (int)$pdo->lastInsertId();

            $resFulfill = $pdo->prepare('
                UPDATE reservations 
                SET status = "fulfilled" 
                WHERE book_id = ? AND student_id = ? AND status = "active"
                LIMIT 1
            ');
            $resFulfill->execute([$book_id, $student_id]);

            $pdo->commit();

            json_response([
                'success'      => true,
                'message'      => "Volume \"{$book['title']}\" successfully issued to {$student['name']}.",
                'issue_id'     => $newIssueId,
                'issue_date'   => $issueDate,
                'due_date'     => $dueDate,
                'book_title'   => $book['title'],
                'student_name' => $student['name'],
                'member_id'    => $student['member_id'],
                'shelf_no'     => $book['shelf_no']
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Failed to issue textbook: ' . $e->getMessage(), 500);
        }
        break;

    case 'return_book':
        require_librarian();

        $issue_id = (int)($input['issue_id'] ?? 0);
        if ($issue_id <= 0) {
            json_error('Invalid loan record ID.');
        }

        try {
            $pdo->beginTransaction();

            $iStmt = $pdo->prepare('
                SELECT i.*, b.id AS b_id, b.title AS book_title, b.available, b.quantity,
                       s.name AS student_name, s.member_id
                FROM issues i
                JOIN books b ON i.book_id = b.id
                JOIN students s ON i.student_id = s.id
                WHERE i.id = ?
                FOR UPDATE
            ');
            $iStmt->execute([$issue_id]);
            $issue = $iStmt->fetch();

            if (!$issue) {
                $pdo->rollBack();
                json_error('Circulation record not found.');
            }

            if ($issue['return_date'] !== null) {
                $pdo->rollBack();
                json_error('This textbook has already been returned on ' . $issue['return_date'] . '.');
            }

            $returnDate = date('Y-m-d');
            $dueDate    = $issue['due_date'];

            $daysOverdue = 0;
            $fine = 0.00;

            if ($returnDate > $dueDate) {
                $diff = (strtotime($returnDate) - strtotime($dueDate)) / (60 * 60 * 24);
                $daysOverdue = (int)floor($diff);
                $fine = (float)($daysOverdue * DAILY_FINE_RATE);
            }

            $upIssue = $pdo->prepare('UPDATE issues SET return_date = ?, fine = ? WHERE id = ?');
            $upIssue->execute([$returnDate, $fine, $issue_id]);

            $incBook = $pdo->prepare('UPDATE books SET available = LEAST(quantity, available + 1) WHERE id = ?');
            $incBook->execute([$issue['book_id']]);

            $resAlertStmt = $pdo->prepare('
                SELECT r.id, s.name, s.email, s.phone, s.member_id
                FROM reservations r
                JOIN students s ON r.student_id = s.id
                WHERE r.book_id = ? AND r.status = "active"
                ORDER BY r.reserved_on ASC
                LIMIT 1
            ');
            $resAlertStmt->execute([$issue['book_id']]);
            $nextReservation = $resAlertStmt->fetch();

            $pdo->commit();

            json_response([
                'success'          => true,
                'message'          => "Volume \"{$issue['book_title']}\" returned to the library shelves.",
                'book_title'       => $issue['book_title'],
                'student_name'     => $issue['student_name'],
                'member_id'        => $issue['member_id'],
                'return_date'      => $returnDate,
                'due_date'         => $dueDate,
                'days_overdue'     => $daysOverdue,
                'fine'             => $fine,
                'is_overdue'       => ($daysOverdue > 0),
                'next_reservation' => $nextReservation ?: null
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            json_error('Failed to process return: ' . $e->getMessage(), 500);
        }
        break;

    // ========================================================================
    // RESERVATIONS ENDPOINT
    // ========================================================================

    case 'reserve_book':
        $book_id    = (int)($input['book_id'] ?? 0);
        $student_id = (int)($input['student_id'] ?? 0);
        $member_id  = trim($input['member_id'] ?? '');

        if ($book_id <= 0) {
            json_error('Invalid textbook selected for reservation.');
        }

        if ($student_id <= 0 && $member_id !== '') {
            $sStmt = $pdo->prepare('SELECT id, name FROM students WHERE member_id = ? OR roll_no = ? LIMIT 1');
            $sStmt->execute([$member_id, $member_id]);
            $foundStudent = $sStmt->fetch();
            if (!$foundStudent) {
                json_error('Member ID or Roll No "' . htmlspecialchars($member_id) . '" not recognized.');
            }
            $student_id = (int)$foundStudent['id'];
        }

        if ($student_id <= 0) {
            json_error('Please specify a valid student member.');
        }

        $bStmt = $pdo->prepare('SELECT title FROM books WHERE id = ? LIMIT 1');
        $bStmt->execute([$book_id]);
        $bookTitle = $bStmt->fetchColumn();
        if (!$bookTitle) {
            json_error('Textbook not found in catalogue.');
        }

        $dupStmt = $pdo->prepare('
            SELECT id FROM reservations 
            WHERE book_id = ? AND student_id = ? AND status = "active" 
            LIMIT 1
        ');
        $dupStmt->execute([$book_id, $student_id]);
        if ($dupStmt->fetch()) {
            json_error("An active reservation for \"{$bookTitle}\" is already logged for this scholar.");
        }

        $insRes = $pdo->prepare('INSERT INTO reservations (book_id, student_id, reserved_on, status) VALUES (?, ?, NOW(), "active")');
        $insRes->execute([$book_id, $student_id]);

        json_response([
            'success' => true,
            'message' => "Reservation confirmed! You will be priority notified when \"{$bookTitle}\" is returned."
        ]);
        break;

    // ========================================================================
    // CSV EXPORT (BOOKS / MEMBERS / CIRCULATION)
    // ========================================================================

    case 'export_csv':
        $type = trim($_GET['type'] ?? 'books');

        if ($type === 'books') {
            $stmt = $pdo->query('SELECT id, title, author, isbn, category, class_grade, board, medium, subject, quantity, available, shelf_no, created_at FROM books ORDER BY id ASC');
            $rows = $stmt->fetchAll();

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="athenaeum_ncert_upboard_books_' . date('Y-m-d') . '.csv"');

            $output = fopen('php://output', 'w');
            fputcsv($output, ['ID', 'Title', 'Author', 'ISBN', 'Category', 'Class/Grade', 'Board', 'Medium', 'Subject', 'Total Copies', 'Available Copies', 'Shelf Location', 'Catalogued On']);
            foreach ($rows as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['title'],
                    $row['author'],
                    $row['isbn'],
                    $row['category'],
                    $row['class_grade'],
                    $row['board'],
                    $row['medium'],
                    $row['subject'],
                    $row['quantity'],
                    $row['available'],
                    $row['shelf_no'],
                    $row['created_at']
                ]);
            }
            fclose($output);
            exit;

        } elseif ($type === 'students') {
            $stmt = $pdo->query('
                SELECT s.id, s.name, s.roll_no, s.email, s.phone, s.member_id, s.created_at,
                       (SELECT COUNT(*) FROM issues i WHERE i.student_id = s.id AND i.return_date IS NULL) AS active_loans
                FROM students s 
                ORDER BY s.id ASC
            ');
            $rows = $stmt->fetchAll();

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="athenaeum_scholars_' . date('Y-m-d') . '.csv"');

            $output = fopen('php://output', 'w');
            fputcsv($output, ['ID', 'Name', 'Roll Number', 'Email', 'Phone', 'Member ID', 'Registered On', 'Active Loans']);
            foreach ($rows as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['name'],
                    $row['roll_no'],
                    $row['email'],
                    $row['phone'],
                    $row['member_id'],
                    $row['created_at'],
                    $row['active_loans']
                ]);
            }
            fclose($output);
            exit;

        } elseif ($type === 'issues') {
            $stmt = $pdo->query('
                SELECT 
                    i.id, b.title AS book_title, b.isbn, b.shelf_no, b.class_grade,
                    s.name AS student_name, s.roll_no, s.member_id,
                    i.issue_date, i.due_date, i.return_date, i.fine,
                    CASE 
                        WHEN i.return_date IS NOT NULL THEN "Returned"
                        WHEN i.due_date < CURRENT_DATE THEN "Overdue"
                        ELSE "Active"
                    END AS loan_status
                FROM issues i
                JOIN books b ON i.book_id = b.id
                JOIN students s ON i.student_id = s.id
                ORDER BY i.id DESC
            ');
            $rows = $stmt->fetchAll();

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="athenaeum_circulation_ledger_' . date('Y-m-d') . '.csv"');

            $output = fopen('php://output', 'w');
            fputcsv($output, ['Issue ID', 'Book Title', 'ISBN', 'Class', 'Shelf Location', 'Scholar Name', 'Roll Number', 'Member ID', 'Issue Date', 'Due Date', 'Return Date', 'Fine (Rs)', 'Status']);
            foreach ($rows as $row) {
                fputcsv($output, [
                    $row['id'],
                    $row['book_title'],
                    $row['isbn'],
                    $row['class_grade'],
                    $row['shelf_no'],
                    $row['student_name'],
                    $row['roll_no'],
                    $row['member_id'],
                    $row['issue_date'],
                    $row['due_date'],
                    $row['return_date'] ?? 'On Loan',
                    $row['fine'],
                    $row['loan_status']
                ]);
            }
            fclose($output);
            exit;

        } else {
            json_error('Invalid export type requested.');
        }
        break;

    default:
        json_error('Action "' . htmlspecialchars($action) . '" is unrecognized.');
        break;
}
