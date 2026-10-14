-- ============================================================================
-- THE ATHENAEUM LIBRARY MANAGEMENT SYSTEM
-- NCERT & UP BOARD CURRICULUM UPGRADE (LKG to 12th Grade)
-- & READING DESK TOKEN SYSTEM (वाचनालय प्रवेश टोकन व्यवस्था)
-- ============================================================================

USE `library_db`;

-- Add class, board, medium, and subject columns if not exist
ALTER TABLE `books` 
  ADD COLUMN IF NOT EXISTS `class_grade` VARCHAR(30) NOT NULL DEFAULT 'General' AFTER `category`,
  ADD COLUMN IF NOT EXISTS `board` VARCHAR(50) NOT NULL DEFAULT 'NCERT / UP Board' AFTER `class_grade`,
  ADD COLUMN IF NOT EXISTS `medium` VARCHAR(30) NOT NULL DEFAULT 'Hindi' AFTER `board`,
  ADD COLUMN IF NOT EXISTS `subject` VARCHAR(100) NOT NULL DEFAULT 'General' AFTER `medium`,
  ADD COLUMN IF NOT EXISTS `description` TEXT NULL AFTER `shelf_no`,
  ADD COLUMN IF NOT EXISTS `pdf_preview_url` VARCHAR(500) NULL AFTER `description`;

-- Reading Desk Tokens Table (वाचनालय टोकन)
CREATE TABLE IF NOT EXISTS `reading_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token_number` INT NOT NULL,
  `token_code` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `book_id` INT NOT NULL,
  `desk_number` VARCHAR(40) NOT NULL,
  `issued_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `returned_at` TIMESTAMP NULL,
  `status` ENUM('active', 'completed') NOT NULL DEFAULT 'active',
  INDEX `idx_token_status` (`status`),
  INDEX `idx_token_desk` (`desk_number`),
  CONSTRAINT `fk_token_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_token_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Update existing books with curriculum tags
-- ----------------------------------------------------------------------------
UPDATE `books` SET `class_grade` = 'Class 11 & 12', `board` = 'General Reference', `medium` = 'English', `subject` = 'English Literature' WHERE `id` = 1;
UPDATE `books` SET `class_grade` = 'Class 10 & 11', `board` = 'General Reference', `medium` = 'English', `subject` = 'English Literature' WHERE `id` = 2;
UPDATE `books` SET `class_grade` = 'Class 11 & 12', `board` = 'Reference Science', `medium` = 'English', `subject` = 'Physics (भौतिकी)' WHERE `id` = 3;
UPDATE `books` SET `class_grade` = 'College / Senior', `board` = 'Computer Science', `medium` = 'English', `subject` = 'Computer Science' WHERE `id` = 4;
UPDATE `books` SET `class_grade` = 'Senior Secondary', `board` = 'Philosophy', `medium` = 'English', `subject` = 'Ethics & Philosophy' WHERE `id` = 5;

-- ----------------------------------------------------------------------------
-- SEED FULL NCERT & UP BOARD TEXTBOOK COLLECTION (LKG to 12th)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `books` (`id`, `title`, `author`, `isbn`, `category`, `class_grade`, `board`, `medium`, `subject`, `quantity`, `available`, `cover_url`, `shelf_no`, `description`, `pdf_preview_url`) VALUES
-- PRE-PRIMARY (LKG & UKG)
(20, 'आनंद 1 (Balvatika 1 - LKG)', 'NCERT / UPMSP', '978-817450001LKG', 'Pre-Primary (बालवाटिका)', 'LKG', 'NCERT / UP Board', 'Hindi', 'Balvatika (बालवाटिका)', 6, 5, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80', 'Almirah Bal-01', 'कक्षा LKG के लिए चित्र, सरल बालगीत, तुकबंदी और आकृतियों की बुनियादी पहचान।', 'https://epathshala.nic.in/'),
(21, 'उल्लास 2 (Balvatika 2 - UKG)', 'NCERT / UPMSP', '978-817450002UKG', 'Pre-Primary (बालवाटिका)', 'UKG', 'NCERT / UP Board', 'Hindi', 'Balvatika (बालवाटिका)', 6, 6, 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80', 'Almirah Bal-02', 'कक्षा UKG के लिए वर्णमाला परिचय, 1 से 20 तक गिनती एवं मनोरंजक कहानियों का संग्रह।', 'https://epathshala.nic.in/'),

-- PRIMARY (Class 1 to 5)
(22, 'सारंगी भाग 1 (Hindi Class 1)', 'NCERT', '978-817450003C01', 'Primary (प्राथमिक)', 'Class 1', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 8, 7, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-01', 'राष्ट्रीय पाठ्यचर्या 2023 के तहत कक्षा 1 की नई हिंदी पाठ्यपुस्तक - वर्णमाला, कविताएं और पहेलियां।', 'https://ncert.nic.in/textbook.php'),
(23, 'आनंदमय गणित 1 (Joyful Mathematics Class 1)', 'NCERT / UP Board', '978-817450004C01', 'Primary (प्राथमिक)', 'Class 1', 'NCERT / UP Board', 'Bilingual', 'Mathematics (गणित)', 8, 8, 'https://images.unsplash.com/photo-1632571401005-458e9d244591?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-02', 'कक्षा 1 के विद्यार्थियों के लिए खेल-खेल में संख्याएं, जोड़ना-घटाना और आकार पहचान।', 'https://ncert.nic.in/textbook.php'),
(24, 'मृदंग भाग 2 (Mridang English Class 2)', 'NCERT', '978-817450005C02', 'Primary (प्राथमिक)', 'Class 2', 'NCERT / UP Board', 'English', 'English (अंग्रेजी)', 6, 5, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-03', 'Class 2 English textbook featuring engaging rhymes, phonics, and foundational vocabulary.', 'https://ncert.nic.in/textbook.php'),
(25, 'गणित का जादू 2 (Math-Magic Class 2)', 'NCERT / UP Board', '978-817450006C02', 'Primary (प्राथमिक)', 'Class 2', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 6, 6, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-04', 'कक्षा 2 गणित: गिनतारा, स्थानीय मान, 100 तक गिनती और मुद्रा (रुपये-पैसे) की बुनियादी समझ।', 'https://ncert.nic.in/textbook.php'),
(26, 'वीणा भाग 3 (Veena Hindi Class 3)', 'NCERT / UP Board', '978-817450007C03', 'Primary (प्राथमिक)', 'Class 3', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 6, 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-05', 'कक्षा 3 के लिए नई हिंदी पुस्तक: प्रेरक प्रसंग, लोककथाएं और रचनात्मक भाषा विकास।', 'https://ncert.nic.in/textbook.php'),
(27, 'हमारा परिवेश 3 (Our Surroundings - UP Board)', 'UPMSP / Basic Shiksha', '978-817450008C03', 'Primary (प्राथमिक)', 'Class 3', 'UP Board', 'Hindi', 'Environmental Studies (हमारा परिवेश)', 6, 5, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-06', 'उत्तर प्रदेश बेसिक शिक्षा परिषद: घर-परिवार, पशु-पक्षी, जल और पेड़-पौधों का अध्ययन।', 'https://upmsp.edu.in/'),
(28, 'रिमझिम भाग 4 (Rimjhim Hindi Class 4)', 'NCERT / UP Board', '978-817450009C04', 'Primary (प्राथमिक)', 'Class 4', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 4, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-07', 'कक्षा 4 हिंदी: मन के भोले-भाले बादल, जैसा सवाल वैसा जवाब, पापा जब बच्चे थे और रोचक व्याकरण।', 'https://ncert.nic.in/textbook.php'),
(29, 'गणित का जादू 4 (Math-Magic Class 4)', 'NCERT / UP Board', '978-817450010C04', 'Primary (प्राथमिक)', 'Class 4', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 6, 6, 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-08', 'कक्षा 4 गणित: ईंटों से बनी इमारत, लंबा और छोटा, भोपाल की सैर, कबाड़ीवाली और पहाड़े।', 'https://ncert.nic.in/textbook.php'),
(30, 'आस पास 5 (Aas Paas Class 5 EVS)', 'NCERT / UP Board', '978-817450011C05', 'Primary (प्राथमिक)', 'Class 5', 'NCERT / UP Board', 'Hindi', 'Environmental Studies (पर्यावरण)', 6, 5, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-09', 'कक्षा 5 पर्यावरण: कैसे पहचाना चींटी ने दोस्त को, कहानी सपेरों की, चखने से पचने तक, बीज-बीज-बीज।', 'https://ncert.nic.in/textbook.php'),
(31, 'गिनतारा 5 (Gintara Math Class 5 - UP Board)', 'UPMSP / Basic Shiksha', '978-817450012C05', 'Primary (प्राथमिक)', 'Class 5', 'UP Board', 'Hindi', 'Mathematics (गणित)', 6, 6, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80', 'Shelf Pri-10', 'यूपी बोर्ड कक्षा 5: संख्याएं, लघुत्तम समापवर्त्य (LCM), महत्तम समापवर्तक (HCF), दशमलव और भिन्न।', 'https://upmsp.edu.in/'),

-- MIDDLE SCHOOL (Class 6 to 8)
(32, 'वसंत भाग 1 (Vasant Hindi Class 6)', 'NCERT / UP Board', '978-817450013C06', 'Middle School (कक्षा 6-8)', 'Class 6', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 5, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-01', 'कक्षा 6 हिंदी: वह चिड़िया जो, बचपन, नादान दोस्त, चाँद से थोड़ी सी गप्पें और अक्षरों का महत्व।', 'https://ncert.nic.in/textbook.php'),
(33, 'गणित कक्षा 6 (NCERT & UP Board Math 6)', 'NCERT / UPMSP', '978-817450014C06', 'Middle School (कक्षा 6-8)', 'Class 6', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 6, 4, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-02', 'कक्षा 6 गणित: अपनी संख्याओं की जानकारी, पूर्ण संख्याएं, संख्याओं के साथ खेलना, आधारभूत ज्यामिति।', 'https://ncert.nic.in/textbook.php'),
(34, 'विज्ञान कक्षा 6 (Science Class 6)', 'NCERT / UP Board', '978-817450015C06', 'Middle School (कक्षा 6-8)', 'Class 6', 'NCERT / UP Board', 'Hindi', 'Science (विज्ञान)', 6, 5, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-03', 'कक्षा 6 विज्ञान: भोजन के घटक, तंतु से वस्त्र तक, वस्तुओं के समूह बनाना, पदार्थों का पृथक्करण।', 'https://ncert.nic.in/textbook.php'),
(35, 'वसंत भाग 2 (Vasant Hindi Class 7)', 'NCERT / UP Board', '978-817450016C07', 'Middle School (कक्षा 6-8)', 'Class 7', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 6, 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-04', 'कक्षा 7 हिंदी: हम पंछी उन्मुक्त गगन के, दादी माँ, हिमालय की बेटियां, कठपुतली और मिठाईवाला।', 'https://ncert.nic.in/textbook.php'),
(36, 'विज्ञान कक्षा 7 (Science Class 7)', 'NCERT / UP Board', '978-817450017C07', 'Middle School (कक्षा 6-8)', 'Class 7', 'NCERT / UP Board', 'Hindi', 'Science (विज्ञान)', 6, 5, 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-05', 'कक्षा 7 विज्ञान: पादपों में पोषण, प्राणियों में पोषण, ऊष्मा, अम्ल क्षारक और लवण, भौतिक एवं रासायनिक परिवर्तन।', 'https://ncert.nic.in/textbook.php'),
(37, 'हमारा पर्यावरण 7 (Our Environment Class 7)', 'NCERT / UP Board', '978-817450018C07', 'Middle School (कक्षा 6-8)', 'Class 7', 'NCERT / UP Board', 'Hindi', 'Social Science (सामाजिक विज्ञान)', 6, 6, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-06', 'कक्षा 7 भूगोल: पर्यावरण, हमारी पृथ्वी के अंदर, हमारी बदलती पृथ्वी, वायु, जल और प्राकृतिक वनस्पति।', 'https://ncert.nic.in/textbook.php'),
(38, 'वसंत भाग 3 (Vasant Hindi Class 8)', 'NCERT / UP Board', '978-817450019C08', 'Middle School (कक्षा 6-8)', 'Class 8', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 5, 'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-07', 'कक्षा 8 हिंदी: ध्वनि, लाख की चूड़ियां, बस की यात्रा, दीवानों की हस्ती, भगवान के डाकिए और सुदामा चरित।', 'https://ncert.nic.in/textbook.php'),
(39, 'गणित कक्षा 8 (NCERT Mathematics Class 8)', 'NCERT / UP Board', '978-817450020C08', 'Middle School (कक्षा 6-8)', 'Class 8', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 6, 5, 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-08', 'कक्षा 8 गणित: परिमेय संख्याएं, एक चर वाले रैखिक समीकरण, चतुर्भुजों को समझना, वर्ग और वर्गमूल।', 'https://ncert.nic.in/textbook.php'),
(40, 'विज्ञान कक्षा 8 (Science Class 8)', 'NCERT / UP Board', '978-817450021C08', 'Middle School (कक्षा 6-8)', 'Class 8', 'NCERT / UP Board', 'Hindi', 'Science (विज्ञान)', 6, 6, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80', 'Shelf Mid-09', 'कक्षा 8 विज्ञान: फसल उत्पादन एवं प्रबंध, सूक्ष्मजीव मित्र एवं शत्रु, कोयला और पेट्रोलियम, दहन और ज्वाला।', 'https://ncert.nic.in/textbook.php'),

-- SECONDARY (Class 9 & 10 - UP Board & NCERT)
(41, 'क्षितिज भाग 1 (Kshitij Hindi Class 9)', 'NCERT / UP Board', '978-817450022C09', 'Secondary (माध्यमिक 9-10)', 'Class 9', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 5, 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-01', 'कक्षा 9 हिंदी: दो बैलों की कथा (प्रेमचंद), ल्हासा की ओर, उपभोक्तावाद की संस्कृति, साखियां एवं सबद (कबीर)।', 'https://ncert.nic.in/textbook.php'),
(42, 'गणित कक्षा 9 (Mathematics Class 9 - UP Board/NCERT)', 'NCERT / UPMSP', '978-817450023C09', 'Secondary (माध्यमिक 9-10)', 'Class 9', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 8, 7, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-02', 'कक्षा 9 गणित: संख्या पद्धति, बहुपद (Polynomials), निर्देशांक ज्यामिति, दो चरों वाले रैखिक समीकरण, त्रिभुज।', 'https://ncert.nic.in/textbook.php'),
(43, 'विज्ञान कक्षा 9 (Science Class 9)', 'NCERT / UP Board', '978-817450024C09', 'Secondary (माध्यमिक 9-10)', 'Class 9', 'NCERT / UP Board', 'Hindi', 'Science (विज्ञान)', 8, 7, 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-03', 'कक्षा 9 विज्ञान: हमारे आस-पास के पदार्थ, परमाणु एवं अणु, जीवन की मौलिक इकाई, गति, बल तथा गति के नियम।', 'https://ncert.nic.in/textbook.php'),
(44, 'भारत और समकालीन विश्व 1 (History Class 9)', 'NCERT / UP Board', '978-817450025C09', 'Secondary (माध्यमिक 9-10)', 'Class 9', 'NCERT / UP Board', 'Hindi', 'Social Science (सामाजिक विज्ञान)', 6, 6, 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-04', 'कक्षा 9 इतिहास: फ्रांसीसी क्रांति, यूरोप में समाजवाद एवं रूसी क्रांति, नात्सीवाद और हिटलर का उदय।', 'https://ncert.nic.in/textbook.php'),
(45, 'क्षितिज भाग 2 (Kshitij Hindi Class 10 - UP Board)', 'NCERT / UPMSP', '978-817450026C10', 'Secondary (माध्यमिक 9-10)', 'Class 10', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 8, 6, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-05', 'कक्षा 10 बोर्ड परीक्षा हिंदी: नेताजी का चश्मा, बालगोबिन भगत, लखनवी अंदाज, पद (सूरदास), राम-लक्ष्मण-परशुराम संवाद।', 'https://ncert.nic.in/textbook.php'),
(46, 'गणित कक्षा 10 (Mathematics Class 10 - UP Board)', 'NCERT / UPMSP', '978-817450027C10', 'Secondary (माध्यमिक 9-10)', 'Class 10', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 10, 8, 'https://images.unsplash.com/photo-1632571401005-458e9d244591?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-06', 'यूपी बोर्ड व सीबीएसई कक्षा 10 गणित: वास्तविक संख्याएं, द्विघात समीकरण, समांतर श्रेणियां, त्रिकोणमिति, सांख्यिकी।', 'https://ncert.nic.in/textbook.php'),
(47, 'विज्ञान कक्षा 10 (Science Class 10 - UP Board & NCERT)', 'NCERT / UPMSP', '978-817450028C10', 'Secondary (माध्यमिक 9-10)', 'Class 10', 'NCERT / UP Board', 'Hindi', 'Science (विज्ञान)', 10, 7, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-07', 'कक्षा 10 विज्ञान बोर्ड परीक्षा: रासायनिक अभिक्रियाएं, अम्ल-क्षार, धातु-अधातु, जैव प्रक्रम, प्रकाश परावर्तन, विद्युत।', 'https://ncert.nic.in/textbook.php'),
(48, 'समकालीन भारत 2 एवं अर्थशास्त्र (Social Science Class 10)', 'NCERT / UPMSP', '978-817450029C10', 'Secondary (माध्यमिक 9-10)', 'Class 10', 'NCERT / UP Board', 'Hindi', 'Social Science (सामाजिक विज्ञान)', 8, 7, 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 'Shelf Sec-08', 'कक्षा 10 सामाजिक विज्ञान: संसाधन एवं विकास, कृषि, विनिर्माण उद्योग, विकास की समझ, मुद्रा और साख।', 'https://ncert.nic.in/textbook.php'),

-- SENIOR SECONDARY (Class 11 & 12 - UP Board & NCERT)
(49, 'आरोह भाग 1 (Aroh Hindi Class 11)', 'NCERT / UP Board', '978-817450030C11', 'Senior Secondary (11-12)', 'Class 11', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 6, 5, 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-01', 'कक्षा 11 हिंदी कोर: नमक का दारोगा (प्रेमचंद), मियां नसीरुद्दीन, अपू के साथ ढाई साल, कबीर के पद, मीरा के पद।', 'https://ncert.nic.in/textbook.php'),
(50, 'भौतिकी भाग 1 (Physics Part 1 Class 11)', 'NCERT / UPMSP', '978-817450031C11', 'Senior Secondary (11-12)', 'Class 11', 'NCERT / UP Board', 'Hindi', 'Physics (भौतिक विज्ञान)', 8, 6, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-02', 'कक्षा 11 भौतिक विज्ञान: मात्रक और मापन, सरल रेखा में गति, समतल में गति, कार्य ऊर्जा और शक्ति, गुरुत्वाकर्षण।', 'https://ncert.nic.in/textbook.php'),
(51, 'रसायन विज्ञान भाग 1 (Chemistry Part 1 Class 11)', 'NCERT / UPMSP', '978-817450032C11', 'Senior Secondary (11-12)', 'Class 11', 'NCERT / UP Board', 'Hindi', 'Chemistry (रसायन विज्ञान)', 8, 6, 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-03', 'कक्षा 11 रसायन विज्ञान: रसायन की मूलभूत अवधारणाएं, परमाणु संरचना, तत्वों का वर्गीकरण, रासायनिक आबंधन।', 'https://ncert.nic.in/textbook.php'),
(52, 'जीव विज्ञान कक्षा 11 (Biology Class 11)', 'NCERT / UPMSP', '978-817450033C11', 'Senior Secondary (11-12)', 'Class 11', 'NCERT / UP Board', 'Hindi', 'Biology (जीव विज्ञान)', 8, 7, 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-04', 'कक्षा 11 जीव विज्ञान: जीव जगत, पादप जगत, प्राणी जगत, कोशिका: जीवन की इकाई, पादप कार्यिकी, मानव शरीर विज्ञान।', 'https://ncert.nic.in/textbook.php'),
(53, 'गणित कक्षा 11 (Mathematics Class 11)', 'NCERT / UPMSP', '978-817450034C11', 'Senior Secondary (11-12)', 'Class 11', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 8, 7, 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-05', 'कक्षा 11 गणित: समुच्चय (Sets), संबंध एवं फलन, त्रिकोणमितीय फलन, सम्मिश्र संख्याएं, द्विपद प्रमेय, सीमा और अवकलज।', 'https://ncert.nic.in/textbook.php'),
(54, 'आरोह भाग 2 (Aroh Hindi Class 12 - UP Board)', 'NCERT / UPMSP', '978-817450035C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Hindi (हिंदी)', 8, 7, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-06', 'कक्षा 12 हिंदी बोर्ड परीक्षा: आत्मपरिचय (हरिवंश राय बच्चन), पतंग, बात सीधी थी पर, भक्तिन (महादेवी वर्मा), बाजार दर्शन।', 'https://ncert.nic.in/textbook.php'),
(55, 'भौतिकी भाग 1 व 2 (Physics Class 12 - UP Board & NCERT)', 'NCERT / UPMSP', '978-817450036C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Physics (भौतिक विज्ञान)', 10, 8, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-07', 'कक्षा 12 भौतिकी: वैद्युत आवेश तथा क्षेत्र, स्थिरवैद्युत विभव, विद्युत धारा, गतिमान आवेश, चुंबकत्व, किरण प्रकाशिकी।', 'https://ncert.nic.in/textbook.php'),
(56, 'रसायन विज्ञान भाग 1 व 2 (Chemistry Class 12 - UP Board)', 'NCERT / UPMSP', '978-817450037C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Chemistry (रसायन विज्ञान)', 10, 8, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-08', 'कक्षा 12 रसायन विज्ञान: विलयन (Solutions), वैद्युतरसायन, रासायनिक बलगतिकी, d- एवं f- ब्लॉक के तत्व, उपसहसंयोजन यौगिक, हेलोऐल्केन।', 'https://ncert.nic.in/textbook.php'),
(57, 'जीव विज्ञान कक्षा 12 (Biology Class 12 - UP Board)', 'NCERT / UPMSP', '978-817450038C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Biology (जीव विज्ञान)', 10, 8, 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-09', 'कक्षा 12 जीव विज्ञान: पुष्पी पादपों में लैंगिक जनन, मानव जनन, वंशागति तथा विविधता के सिद्धांत, जैव प्रौद्योगिकी, पारिस्थितिकी।', 'https://ncert.nic.in/textbook.php'),
(58, 'गणित भाग 1 व 2 (Mathematics Class 12 - UP Board/NCERT)', 'NCERT / UPMSP', '978-817450039C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Mathematics (गणित)', 10, 9, 'https://images.unsplash.com/photo-1632571401005-458e9d244591?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-10', 'कक्षा 12 गणित: संबंध एवं फलन, प्रतिलोम त्रिकोणमितीय फलन, आव्यूह (Matrices), सारणिक, सांतत्य तथा अवकलनीयता, समाकलन (Integrals), सदिश बीजगणित।', 'https://ncert.nic.in/textbook.php'),
(59, 'मानव भूगोल एवं भारतीय अर्थव्यवस्था (Class 12 Arts/Com)', 'NCERT / UPMSP', '978-817450040C12', 'Senior Secondary (11-12)', 'Class 12', 'NCERT / UP Board', 'Hindi', 'Social Science (सामाजिक विज्ञान)', 8, 7, 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 'Shelf SrSec-11', 'कक्षा 12 भूगोल एवं अर्थशास्त्र: मानव भूगोल के प्रकृति एवं विषय क्षेत्र, विश्व जनसंख्या, प्राथमिक क्रियाएं, परिवहन एवं व्यापार।', 'https://ncert.nic.in/textbook.php');

-- ----------------------------------------------------------------------------
-- SEED SAMPLE STUDENTS ACROSS CLASSES
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `students` (`id`, `name`, `roll_no`, `email`, `phone`, `member_id`) VALUES
(7, 'Aarav Kumar (LKG Balvatika)', 'LKG-2026-004', 'aarav.lkg@school.edu', '+91 98111 22233', 'LIB-LKG-004'),
(8, 'Divya Patel (Class 5th Primary)', 'CL05-2026-018', 'divya.p@school.edu', '+91 98222 33344', 'LIB-PRI-018'),
(9, 'Rahul Verma (Class 10th UP Board)', 'UP10-2026-042', 'rahul.v10@school.edu', '+91 98333 44455', 'LIB-UP10-042'),
(10, 'Kavya Singh (Class 12th PCB Board)', 'UP12-2026-099', 'kavya.s12@school.edu', '+91 98444 55566', 'LIB-UP12-099');

-- ----------------------------------------------------------------------------
-- SEED ACTIVE READING DESK TOKENS (वाचनालय में पढ़ रहे बच्चे)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `reading_tokens` (`id`, `token_number`, `token_code`, `student_id`, `book_id`, `desk_number`, `issued_at`, `returned_at`, `status`) VALUES
(1, 101, 'TOK-2026-101', 9, 46, 'Desk #04 (Reading Hall A)', DATE_SUB(NOW(), INTERVAL 45 MINUTE), NULL, 'active'),
(2, 102, 'TOK-2026-102', 10, 55, 'Desk #07 (Science Stacks)', DATE_SUB(NOW(), INTERVAL 25 MINUTE), NULL, 'active'),
(3, 103, 'TOK-2026-103', 8, 30, 'Desk #12 (Primary Corner)', DATE_SUB(NOW(), INTERVAL 90 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE), 'completed');
