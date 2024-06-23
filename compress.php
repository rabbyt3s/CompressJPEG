<?php
ini_set('memory_limit', '256M');

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['image'])) {
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$file = $_FILES['image'];
$originalSize = $file['size'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'File upload failed']);
    exit;
}

$info = getimagesize($file['tmp_name']);
if ($info === false) {
    echo json_encode(['error' => 'Invalid image file']);
    exit;
}

$type = $info[2];
$quality = 85; // Ajustez cette valeur entre 0 et 100 pour modifier le niveau de compression

switch ($type) {
    case IMAGETYPE_JPEG:
        $image = imagecreatefromjpeg($file['tmp_name']);
        break;
    case IMAGETYPE_PNG:
        $image = imagecreatefrompng($file['tmp_name']);
        imagealphablending($image, true);
        imagesavealpha($image, true);
        break;
    case IMAGETYPE_GIF:
        $image = imagecreatefromgif($file['tmp_name']);
        break;
    default:
        echo json_encode(['error' => 'Unsupported image type']);
        exit;
}

// Redimensionner l'image si elle est trop grande
$maxWidth = 1920;
$maxHeight = 1080;
$width = imagesx($image);
$height = imagesy($image);

if ($width > $maxWidth || $height > $maxHeight) {
    $ratio = min($maxWidth / $width, $maxHeight / $height);
    $newWidth = round($width * $ratio);
    $newHeight = round($height * $ratio);
    $newImage = imagecreatetruecolor($newWidth, $newHeight);
    
    if ($type == IMAGETYPE_PNG) {
        imagealphablending($newImage, false);
        imagesavealpha($newImage, true);
        $transparent = imagecolorallocatealpha($newImage, 255, 255, 255, 127);
        imagefilledrectangle($newImage, 0, 0, $newWidth, $newHeight, $transparent);
    }
    
    imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    $image = $newImage;
}

// Capturer la sortie de l'image
ob_start();
imagejpeg($image, null, $quality);
$imageData = ob_get_clean();

imagedestroy($image);

$compressedSize = strlen($imageData);
$base64Image = base64_encode($imageData);

echo json_encode([
    'base64Image' => 'data:image/jpeg;base64,' . $base64Image,
    'originalSize' => $originalSize,
    'compressedSize' => $compressedSize,
    'compressionRatio' => round(($originalSize - $compressedSize) / $originalSize * 100, 2) . '%'
]);