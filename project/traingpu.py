"""
COMPLETE REAL-TIME BLOOD SMEAR ANALYSIS SYSTEM
- Disease Classification (ViT)
- WBC Type Classification (ViT)  
- Blood Cell Counting (YOLO)
- Enhanced Color Analysis
- Realtime Processing on GPU
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
import torchvision.transforms as transforms
from transformers import ViTForImageClassification, ViTConfig
from ultralytics import YOLO
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2
import os
import glob
import json
from datetime import datetime
import time
from tqdm import tqdm
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.cluster import KMeans
from collections import Counter
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# 1. BLOOD IMAGE VALIDATOR & SECURITY
# ============================================================================

class BloodSecurityValidator:
    """Advanced blood image validation and security"""
    
    def __init__(self):
        # Blood smear characteristics
        self.min_resolution = (512, 512)  # Minimum image size
        self.max_file_size_mb = 50  # Maximum file size
        
        # Blood color profiles (RGB ranges for blood cells)
        self.blood_color_profiles = {
            'rbc_red': ((150, 0, 0), (255, 100, 100)),      # Red blood cells
            'wbc_purple': ((100, 0, 100), (200, 100, 200)), # WBC (stained)
            'platelet_pink': ((200, 150, 150), (255, 200, 200)),
            'background_white': ((220, 220, 220), (255, 255, 255))
        }
        
        # Malicious file extensions
        self.malicious_extensions = ['.exe', '.dll', '.bat', '.cmd', '.ps1', '.sh', '.py']
        
    def validate_image_file(self, image_path):
        """Comprehensive image validation"""
        try:
            # 1. Check file extension
            ext = os.path.splitext(image_path)[1].lower()
            if ext in self.malicious_extensions:
                return False, f"❌ MALICIOUS FILE: {ext} extension detected"
            
            # 2. Check file size
            file_size = os.path.getsize(image_path) / (1024 * 1024)  # MB
            if file_size > self.max_file_size_mb:
                return False, f"❌ FILE TOO LARGE: {file_size:.1f}MB > {self.max_file_size_mb}MB"
            
            # 3. Try to open image
            try:
                img = Image.open(image_path)
                img.verify()  # Verify it's a valid image
                img = Image.open(image_path)  # Re-open for processing
            except:
                return False, "❌ CORRUPTED IMAGE: Cannot open or verify"
            
            # 4. Check resolution
            width, height = img.size
            if width < self.min_resolution[0] or height < self.min_resolution[1]:
                return False, f"❌ LOW RESOLUTION: {width}x{height} < {self.min_resolution[0]}x{self.min_resolution[1]}"
            
            # 5. Check if it's a blood smear
            is_blood, blood_score = self._analyze_blood_content(np.array(img))
            
            if not is_blood:
                return False, f"❌ NOT BLOOD SMEAR: Blood content score {blood_score:.2f} < 0.3"
            
            return True, f"✅ VALID BLOOD SMEAR: {width}x{height}, {file_size:.1f}MB, Blood score: {blood_score:.2f}"
            
        except Exception as e:
            return False, f"❌ VALIDATION ERROR: {str(e)}"
    
    def _analyze_blood_content(self, image_array):
        """Analyze if image contains blood cells"""
        # Convert to RGB if needed
        if len(image_array.shape) == 2:  # Grayscale
            image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
        
        # Check blood color ranges
        blood_pixels = 0
        total_pixels = image_array.shape[0] * image_array.shape[1]
        
        for color_name, (lower, upper) in self.blood_color_profiles.items():
            if color_name != 'background_white':
                # Create mask for this color range
                lower_np = np.array(lower, dtype=np.uint8)
                upper_np = np.array(upper, dtype=np.uint8)
                mask = cv2.inRange(image_array, lower_np, upper_np)
                blood_pixels += np.sum(mask > 0)
        
        blood_score = blood_pixels / total_pixels
        is_blood = blood_score > 0.3  # At least 30% blood-colored pixels
        
        return is_blood, blood_score

# ============================================================================
# 2. ENHANCED COLOR ANALYSIS
# ============================================================================

class EnhancedColorAnalyzer:
    """Advanced color analysis for blood smears"""
    
    def __init__(self):
        # Disease color signatures (RGB ranges)
        self.disease_color_signatures = {
            'malaria Parasitized': {
                'ring_forms': ((180, 0, 0), (220, 50, 50)),  # Dark red rings
                'schizonts': ((150, 50, 50), (180, 100, 100)),  # Multiple parasites
                'gametocytes': ((200, 100, 100), (230, 150, 150))  # Crescent forms
            },
            'Babesia_1173': {
                'maltese_cross': ((120, 0, 0), (160, 30, 30)),  # Characteristic cross
                'ring_forms': ((140, 20, 20), (180, 60, 60))
            },
            'Leishmania_2701': {
                'amastigotes': ((80, 40, 60), (120, 80, 100)),  # Purple dots in macrophages
                'macrophages': ((150, 100, 120), (190, 140, 160))
            },
            'Trypanosome_2385': {
                'trypomastigotes': ((60, 30, 40), (100, 70, 80)),  # Slender purple forms
                'nucleus': ((100, 50, 60), (140, 90, 100))
            }
        }
        
        # Cell type color profiles
        self.cell_color_profiles = {
            'RBC': {
                'normal': ((150, 30, 30), (200, 80, 80)),
                'hypochromic': ((200, 150, 150), (240, 190, 190)),  # Pale
                'hyperchromic': ((100, 10, 10), (150, 40, 40))  # Dark
            },
            'WBC': {
                'neutrophil': ((120, 80, 150), (180, 140, 200)),  # Purple granules
                'lymphocyte': ((100, 90, 160), (160, 150, 220)),  # Deep blue
                'eosinophil': ((150, 100, 50), (200, 150, 100)),  # Orange granules
                'basophil': ((80, 60, 120), (130, 110, 170)),  # Dark purple
                'monocyte': ((140, 120, 180), (190, 170, 230))  # Gray-blue
            },
            'Platelet': {
                'normal': ((180, 160, 170), (220, 200, 210)),
                'activated': ((150, 40, 60), (190, 80, 100))  # Clumped, darker
            }
        }
    
    def analyze_comprehensive_color(self, image_array):
        """
        Complete color analysis in real-time
        Returns: RGB, HSV, LAB statistics + disease indicators + staining quality
        """
        start_time = time.time()
        
        if len(image_array.shape) == 2:
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
        else:
            image_rgb = image_array
        
        results = {}
        
        # 1. RGB Color Space Analysis
        results['rgb_stats'] = self._analyze_rgb_space(image_rgb)
        
        # 2. HSV Color Space Analysis
        hsv_image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        results['hsv_stats'] = self._analyze_hsv_space(hsv_image)
        
        # 3. LAB Color Space Analysis
        lab_image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
        results['lab_stats'] = self._analyze_lab_space(lab_image)
        
        # 4. Dominant Colors (K-means clustering)
        results['dominant_colors'] = self._extract_dominant_colors(image_rgb, n_colors=5)
        
        # 5. Disease Color Indicators
        results['disease_indicators'] = self._detect_disease_colors(image_rgb)
        
        # 6. Staining Quality Assessment
        results['staining_quality'] = self._assess_staining_quality(image_rgb)
        
        # 7. Cell Type Color Features
        results['cell_color_features'] = self._analyze_cell_colors(image_rgb)
        
        results['processing_time_ms'] = (time.time() - start_time) * 1000
        
        return results
    
    def _analyze_rgb_space(self, image_rgb):
        """Analyze RGB color space"""
        r, g, b = cv2.split(image_rgb)
        
        stats = {
            'red': {
                'mean': float(np.mean(r)),
                'std': float(np.std(r)),
                'median': float(np.median(r)),
                'min': float(np.min(r)),
                'max': float(np.max(r))
            },
            'green': {
                'mean': float(np.mean(g)),
                'std': float(np.std(g)),
                'median': float(np.median(g)),
                'min': float(np.min(g)),
                'max': float(np.max(g))
            },
            'blue': {
                'mean': float(np.mean(b)),
                'std': float(np.std(b)),
                'median': float(np.median(b)),
                'min': float(np.min(b)),
                'max': float(np.max(b))
            }
        }
        
        # Color ratios (important for blood analysis)
        stats['color_ratios'] = {
            'r_g_ratio': float(np.mean(r) / (np.mean(g) + 1e-6)),
            'r_b_ratio': float(np.mean(r) / (np.mean(b) + 1e-6)),
            'g_b_ratio': float(np.mean(g) / (np.mean(b) + 1e-6))
        }
        
        return stats
    
    def _analyze_hsv_space(self, hsv_image):
        """Analyze HSV color space"""
        h, s, v = cv2.split(hsv_image)
        
        stats = {
            'hue': {
                'mean': float(np.mean(h)),
                'std': float(np.std(h)),
                'dominant_hue': float(np.argmax(np.histogram(h, bins=180)[0]))
            },
            'saturation': {
                'mean': float(np.mean(s)),
                'std': float(np.std(s)),
                'vibrant_pixels': float(np.sum(s > 100) / (s.size + 1e-6) * 100)
            },
            'value': {
                'mean': float(np.mean(v)),
                'std': float(np.std(v)),
                'brightness_score': float(np.mean(v) / 255 * 100)
            }
        }
        
        # Blood-specific HSV features
        red_hue_mask = ((h < 10) | (h > 170)) & (s > 50) & (v > 50)
        purple_hue_mask = (h > 130) & (h < 160) & (s > 40) & (v > 40)
        
        stats['blood_hue_features'] = {
            'red_pixels_percent': float(np.sum(red_hue_mask) / (h.size + 1e-6) * 100),
            'purple_pixels_percent': float(np.sum(purple_hue_mask) / (h.size + 1e-6) * 100),
            'blood_pixels_total': float((np.sum(red_hue_mask) + np.sum(purple_hue_mask)) / (h.size + 1e-6) * 100)
        }
        
        return stats
    
    def _analyze_lab_space(self, lab_image):
        """Analyze LAB color space (perceptually uniform)"""
        l, a, b = cv2.split(lab_image)
        
        stats = {
            'lightness': {
                'mean': float(np.mean(l)),
                'std': float(np.std(l)),
                'contrast': float(np.max(l) - np.min(l))
            },
            'green_red': {
                'mean': float(np.mean(a)),
                'std': float(np.std(a)),
                'red_dominance': float(np.sum(a > 0) / (a.size + 1e-6) * 100)
            },
            'blue_yellow': {
                'mean': float(np.mean(b)),
                'std': float(np.std(b)),
                'yellow_dominance': float(np.sum(b > 0) / (b.size + 1e-6) * 100)
            }
        }
        
        return stats
    
    def _extract_dominant_colors(self, image_rgb, n_colors=5):
        """Extract dominant colors using K-means"""
        # Reshape image to list of pixels
        pixels = image_rgb.reshape(-1, 3)
        
        # Take sample for faster processing
        if len(pixels) > 10000:
            sample_indices = np.random.choice(len(pixels), 10000, replace=False)
            pixels = pixels[sample_indices]
        
        # Apply K-means
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get colors and percentages
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        counts = Counter(labels)
        
        total = len(labels)
        dominant_colors = []
        
        for i in range(n_colors):
            color_rgb = colors[i]
            percentage = (counts[i] / total) * 100
            
            # Convert to HEX
            hex_color = '#{:02x}{:02x}{:02x}'.format(color_rgb[0], color_rgb[1], color_rgb[2])
            
            # Color name approximation
            color_name = self._get_color_name(color_rgb)
            
            dominant_colors.append({
                'rgb': color_rgb.tolist(),
                'hex': hex_color,
                'percentage': float(percentage),
                'name': color_name
            })
        
        # Sort by percentage
        dominant_colors.sort(key=lambda x: x['percentage'], reverse=True)
        
        return dominant_colors
    
    def _get_color_name(self, rgb):
        """Approximate color name from RGB"""
        r, g, b = rgb
        
        # Color name mapping based on RGB values
        if r > 200 and g < 100 and b < 100:
            return "Red"
        elif r > 200 and g > 200 and b > 200:
            return "White"
        elif r < 100 and g < 100 and b > 150:
            return "Blue"
        elif r > 150 and g < 100 and b > 150:
            return "Purple"
        elif r > 150 and g > 100 and b < 100:
            return "Orange"
        elif r > 150 and g > 150 and b < 100:
            return "Yellow"
        elif r < 100 and g > 150 and b < 100:
            return "Green"
        elif r > 180 and g > 150 and b > 150:
            return "Pink"
        else:
            return "Mixed"
    
    def _detect_disease_colors(self, image_rgb):
        """Detect disease-specific color patterns"""
        disease_scores = {}
        
        for disease, color_signatures in self.disease_color_signatures.items():
            total_score = 0
            signature_detections = {}
            
            for signature_name, (lower, upper) in color_signatures.items():
                lower_np = np.array(lower, dtype=np.uint8)
                upper_np = np.array(upper, dtype=np.uint8)
                
                mask = cv2.inRange(image_rgb, lower_np, upper_np)
                percentage = np.sum(mask > 0) / (image_rgb.shape[0] * image_rgb.shape[1]) * 100
                
                signature_detections[signature_name] = {
                    'percentage': float(percentage),
                    'pixels': int(np.sum(mask > 0))
                }
                
                total_score += percentage
            
            disease_scores[disease] = {
                'total_score': float(total_score),
                'signatures': signature_detections,
                'confidence': float(min(total_score * 2, 100))  # Convert to percentage
            }
        
        # Sort by confidence
        sorted_diseases = sorted(disease_scores.items(), key=lambda x: x[1]['confidence'], reverse=True)
        
        return dict(sorted_diseases[:3])  # Return top 3
    
    def _assess_staining_quality(self, image_rgb):
        """Assess quality of blood smear staining"""
        # Convert to LAB for better color analysis
        lab_image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab_image)
        
        # 1. Contrast assessment
        contrast_score = np.std(l) / 128 * 100  # Normalize
        
        # 2. Color separation (WBC vs RBC)
        # Count purple pixels (WBC staining)
        hsv_image = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        h, s, v = cv2.split(hsv_image)
        purple_mask = (h > 130) & (h < 160) & (s > 40) & (v > 40)
        red_mask = ((h < 10) | (h > 170)) & (s > 50) & (v > 50)
        
        purple_percentage = np.sum(purple_mask) / (h.size + 1e-6) * 100
        red_percentage = np.sum(red_mask) / (h.size + 1e-6) * 100
        
        color_separation_score = abs(purple_percentage - red_percentage) / max(purple_percentage, red_percentage + 1e-6) * 100
        
        # 3. Background cleanliness
        white_background = np.sum(v > 220) / (v.size + 1e-6) * 100
        background_score = min(white_background, 100)
        
        # 4. Overall quality score
        overall_score = (contrast_score * 0.4 + color_separation_score * 0.3 + background_score * 0.3)
        
        quality_assessment = {
            'contrast_score': float(contrast_score),
            'color_separation_score': float(color_separation_score),
            'background_score': float(background_score),
            'overall_quality': float(overall_score),
            'grade': self._get_staining_grade(overall_score),
            'recommendations': self._get_staining_recommendations(overall_score)
        }
        
        return quality_assessment
    
    def _get_staining_grade(self, score):
        """Get staining quality grade"""
        if score >= 90:
            return "Excellent"
        elif score >= 80:
            return "Good"
        elif score >= 70:
            return "Fair"
        elif score >= 60:
            return "Poor"
        else:
            return "Unacceptable"
    
    def _get_staining_recommendations(self, score):
        """Get staining improvement recommendations"""
        if score >= 80:
            return ["No improvement needed", "Professional quality"]
        elif score >= 70:
            return ["Increase staining time", "Check stain freshness"]
        else:
            return ["Re-stain slide", "Use fresh reagents", "Adjust pH of stain"]
    
    def _analyze_cell_colors(self, image_rgb):
        """Analyze colors specific to different cell types"""
        cell_analysis = {}
        
        for cell_type, color_profiles in self.cell_color_profiles.items():
            type_analysis = {}
            
            for subtype, (lower, upper) in color_profiles.items():
                lower_np = np.array(lower, dtype=np.uint8)
                upper_np = np.array(upper, dtype=np.uint8)
                
                mask = cv2.inRange(image_rgb, lower_np, upper_np)
                percentage = np.sum(mask > 0) / (image_rgb.shape[0] * image_rgb.shape[1]) * 100
                
                type_analysis[subtype] = {
                    'percentage': float(percentage),
                    'pixel_count': int(np.sum(mask > 0)),
                    'color_range': {'lower': lower, 'upper': upper}
                }
            
            cell_analysis[cell_type] = type_analysis
        
        return cell_analysis

# ============================================================================
# 3. DATASET CLASS WITH VALIDATION
# ============================================================================

class BloodSmearDataset(Dataset):
    def __init__(self, data_dir, classes, transform=None, security_validator=None):
        self.data_dir = data_dir
        self.classes = classes
        self.transform = transform
        self.security_validator = security_validator
        self.color_analyzer = EnhancedColorAnalyzer()
        
        self.image_paths = []
        self.labels = []
        self.color_features = []  # Store color features for each image
        
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
        
        print("🔍 Loading and validating dataset...")
        
        for class_name in classes:
            class_path = os.path.join(data_dir, class_name)
            if os.path.exists(class_path):
                images_in_class = 0
                for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG']:
                    images = glob.glob(os.path.join(class_path, ext))
                    for img_path in images:
                        # Security validation
                        if security_validator:
                            is_valid, message = security_validator.validate_image_file(img_path)
                            if not is_valid:
                                print(f"⚠️  Rejected: {message}")
                                continue
                        
                        # Load and extract color features
                        try:
                            img = Image.open(img_path).convert('RGB')
                            img_array = np.array(img)
                            
                            # Extract color features
                            color_features = self.color_analyzer.analyze_comprehensive_color(img_array)
                            
                            self.image_paths.append(img_path)
                            self.labels.append(self.class_to_idx[class_name])
                            self.color_features.append(color_features)
                            images_in_class += 1
                            
                        except Exception as e:
                            print(f"⚠️  Error processing {img_path}: {e}")
                            continue
                
                print(f"✅ {class_name}: {images_in_class} valid images")
        
        print(f"📁 Total loaded: {len(self.image_paths)} images for {len(classes)} classes")
        print(f"🎨 Color features extracted for all images")
    
    def __len__(self):
        return len(self.image_paths)
    
    def __getitem__(self, idx):
        image_path = self.image_paths[idx]
        label = self.labels[idx]
        color_feature = self.color_features[idx]
        
        image = Image.open(image_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        
        return image, label, color_feature

# ============================================================================
# 4. REAL-TIME BLOOD CELL COUNTER
# ============================================================================

class RealTimeCellCounter:
    """Real-time blood cell counting with accurate calculations"""
    
    def __init__(self):
        # Microscope calibration constants
        self.pixel_size_um = 0.1  # 100x oil immersion (1 pixel = 0.1 µm)
        self.field_area_mm2 = 0.01  # Standard field area
        self.dilution_factor = 200  # Standard blood dilution
        self.depth_correction = 0.1  # Correction for monolayer
        
        # Cell size ranges (in micrometers)
        self.cell_size_ranges = {
            'RBC': {'diameter_um': (6.0, 8.5), 'avg_diameter': 7.5},
            'WBC': {'diameter_um': (10.0, 15.0), 'avg_diameter': 12.0},
            'Platelet': {'diameter_um': (1.5, 3.0), 'avg_diameter': 2.0}
        }
    
    def count_cells_realtime(self, image_path, yolo_model):
        """
        Real-time accurate cell counting
        Returns actual cells/µL based on microscope physics
        """
        start_time = time.time()
        
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        original_height, original_width = img.shape[:2]
        
        # Calculate actual field area
        field_width_um = original_width * self.pixel_size_um
        field_height_um = original_height * self.pixel_size_um
        actual_field_area_mm2 = (field_width_um * field_height_um) / 1e6
        
        print(f"🔬 Microscope Calibration:")
        print(f"   Image: {original_width}×{original_height} pixels")
        print(f"   Pixel size: {self.pixel_size_um} µm")
        print(f"   Field: {field_width_um:.1f}×{field_height_um:.1f} µm")
        print(f"   Area: {actual_field_area_mm2:.4f} mm²")
        
        # Run YOLO detection
        results = yolo_model(img)
        
        if not results or results[0].boxes is None:
            print("⚠️ No cells detected")
            return None
        
        # Count cells and measure sizes
        cell_counts = {'RBC': 0, 'WBC': 0, 'Platelet': 0}
        cell_sizes = {'RBC': [], 'WBC': [], 'Platelet': []}
        
        boxes = results[0].boxes
        for box in boxes:
            class_id = int(box.cls[0])
            conf = float(box.conf[0])
            
            if conf < 0.5:  # Confidence threshold
                continue
            
            # Get bounding box dimensions in pixels
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            width_px = x2 - x1
            height_px = y2 - y1
            
            # Convert to micrometers
            width_um = width_px * self.pixel_size_um
            height_um = height_px * self.pixel_size_um
            avg_diameter_um = (width_um + height_um) / 2
            
            # Classify cell type
            if class_id == 0:  # RBC
                cell_counts['RBC'] += 1
                cell_sizes['RBC'].append(avg_diameter_um)
            elif class_id == 1:  # WBC
                cell_counts['WBC'] += 1
                cell_sizes['WBC'].append(avg_diameter_um)
            elif class_id == 2:  # Platelet
                cell_counts['Platelet'] += 1
                cell_sizes['Platelet'].append(avg_diameter_um)
        
        print(f"\n🔢 Raw Cell Counts:")
        print(f"   RBC: {cell_counts['RBC']} cells")
        print(f"   WBC: {cell_counts['WBC']} cells")
        print(f"   Platelet: {cell_counts['Platelet']} cells")
        
        # Calculate concentrations (cells/µL)
        concentrations = self._calculate_concentrations(cell_counts, actual_field_area_mm2)
        
        # Calculate average cell sizes
        avg_sizes = {}
        for cell_type, sizes in cell_sizes.items():
            if sizes:
                avg_um = np.mean(sizes)
                avg_sizes[cell_type] = float(avg_um)
            else:
                avg_sizes[cell_type] = 0.0
        
        # Calculate cell size deviations
        size_deviations = {}
        for cell_type in ['RBC', 'WBC', 'Platelet']:
            if cell_sizes[cell_type]:
                expected_size = self.cell_size_ranges[cell_type]['avg_diameter']
                actual_size = np.mean(cell_sizes[cell_type])
                deviation = ((actual_size - expected_size) / expected_size) * 100
                size_deviations[cell_type] = float(deviation)
        
        processing_time = (time.time() - start_time) * 1000
        
        result = {
            'raw_counts': cell_counts,
            'concentrations_per_uL': concentrations,
            'average_sizes_um': avg_sizes,
            'size_deviations_percent': size_deviations,
            'field_area_mm2': float(actual_field_area_mm2),
            'total_cells': sum(cell_counts.values()),
            'processing_time_ms': float(processing_time),
            'detection_confidence': self._calculate_detection_confidence(cell_counts)
        }
        
        print(f"\n🧮 FINAL CONCENTRATIONS:")
        print(f"   RBC: {concentrations['RBC']:,.0f} cells/µL ({concentrations['RBC']/1e6:.2f} million/µL)")
        print(f"   WBC: {concentrations['WBC']:,.0f} cells/µL ({concentrations['WBC']/1000:.1f} thousand/µL)")
        print(f"   Platelet: {concentrations['Platelet']:,.0f} cells/µL ({concentrations['Platelet']/1000:.0f} thousand/µL)")
        print(f"⏱️  Processing time: {processing_time:.1f} ms")
        
        return result
    
    def _calculate_concentrations(self, cell_counts, field_area_mm2):
        """
        Calculate actual cells/µL using standard hematology formula:
        C = (N / A) × D × 1000 × CF
        
        Where:
          C = Concentration (cells/µL)
          N = Number of cells counted
          A = Area counted (mm²)
          D = Dilution factor (usually 200)
          1000 = Conversion from mm² to µL
          CF = Correction factor for depth
        """
        concentrations = {}
        
        for cell_type, count in cell_counts.items():
            if field_area_mm2 > 0:
                cells_per_mm2 = count / field_area_mm2
                cells_per_uL = cells_per_mm2 * self.dilution_factor * 1000 * self.depth_correction
                concentrations[cell_type] = int(cells_per_uL)
            else:
                concentrations[cell_type] = 0
        
        return concentrations
    
    def _calculate_detection_confidence(self, cell_counts):
        """Calculate confidence score for cell detection"""
        total_cells = sum(cell_counts.values())
        
        if total_cells == 0:
            return 0.0
        
        # Basic confidence based on cell counts
        confidence = min(total_cells / 100 * 100, 100)  # Normalize
        
        # Adjust based on cell type ratios
        if cell_counts['RBC'] > 0:
            wbc_rbc_ratio = cell_counts['WBC'] / cell_counts['RBC']
            if 0.01 <= wbc_rbc_ratio <= 0.1:  # Normal range
                confidence *= 1.1
            else:
                confidence *= 0.9
        
        return float(min(confidence, 100))

# ============================================================================
# 5. COMPLETE TRAINING SYSTEM
# ============================================================================

class CompleteBloodSmearTrainer:
    """Complete training system with all features"""
    
    def __init__(self, dataset_path):
        self.dataset_path = dataset_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        print(f"🚀 INITIALIZING TRAINING SYSTEM on: {self.device}")
        
        # Create directories
        self.models_dir = "trained_models"
        self.results_dir = "training_results"
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.results_dir, exist_ok=True)
        
        # Initialize components
        self.security_validator = BloodSecurityValidator()
        self.color_analyzer = EnhancedColorAnalyzer()
        self.cell_counter = RealTimeCellCounter()
        
        # Class definitions
        self.disease_classes = ['Leishmania_2701', 'Babesia_1173', 'Trichomonad_10134',
                               'Trypanosome_2385', 'malaria Parasitized', 'malaria Uninfected']
        self.wbc_classes = ['neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil']
        
        # Training history
        self.history = {
            'disease_vit': {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': [], 'train_f1': [], 'val_f1': []},
            'wbc_vit': {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': [], 'train_f1': [], 'val_f1': []}
        }
    
    def train_disease_classification(self):
        """Train disease classification model"""
        print("\n" + "="*70)
        print("🦠 TRAINING DISEASE CLASSIFICATION MODEL")
        print("="*70)
        
        start_time = time.time()
        
        # Prepare transforms
        train_transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load dataset
        dataset = BloodSmearDataset(
            self.dataset_path, 
            classes=self.disease_classes,
            transform=train_transform,
            security_validator=self.security_validator
        )
        
        # Split dataset
        train_size = int(0.8 * len(dataset))
        val_size = int(0.1 * len(dataset))
        test_size = len(dataset) - train_size - val_size
        
        train_dataset, temp_dataset = random_split(dataset, [train_size, len(dataset) - train_size])
        val_dataset, test_dataset = random_split(temp_dataset, [val_size, test_size])
        
        # Create data loaders
        train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=4)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
        test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
        
        print(f"📊 Dataset Statistics:")
        print(f"   Total images: {len(dataset):,}")
        print(f"   Train: {len(train_dataset):,}")
        print(f"   Validation: {len(val_dataset):,}")
        print(f"   Test: {len(test_dataset):,}")
        
        # Initialize model
        config = ViTConfig.from_pretrained('google/vit-base-patch16-224')
        config.num_labels = len(self.disease_classes)
        model = ViTForImageClassification(config)
        model = model.to(self.device)
        
        # Training setup
        optimizer = optim.AdamW(model.parameters(), lr=2e-4, weight_decay=0.01)
        criterion = nn.CrossEntropyLoss()
        
        # Training loop
        best_val_acc = 0.0
        epochs = 10
        
        for epoch in range(epochs):
            # Training
            model.train()
            train_loss = 0.0
            correct = 0
            total = 0
            
            pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{epochs}')
            for images, labels, _ in pbar:  # Ignore color features for now
                images, labels = images.to(self.device), labels.to(self.device)
                
                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs.logits, labels)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
                _, predicted = outputs.logits.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
                
                pbar.set_postfix({
                    'Loss': f'{train_loss/(total//16):.4f}',
                    'Acc': f'{100.*correct/total:.1f}%'
                })
            
            # Validation
            model.eval()
            val_correct = 0
            val_total = 0
            
            with torch.no_grad():
                for images, labels, _ in val_loader:
                    images, labels = images.to(self.device), labels.to(self.device)
                    outputs = model(images)
                    _, predicted = outputs.logits.max(1)
                    val_total += labels.size(0)
                    val_correct += predicted.eq(labels).sum().item()
            
            train_acc = 100. * correct / total
            val_acc = 100. * val_correct / val_total
            
            print(f"✅ Epoch {epoch+1}: Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%")
            
            # Save best model
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                model_save_path = os.path.join(self.models_dir, "disease_vit_final")
                model.save_pretrained(model_save_path)
                print(f"💾 Best model saved! Val Acc: {val_acc:.2f}%")
        
        # Final evaluation
        model.eval()
        test_correct = 0
        test_total = 0
        
        with torch.no_grad():
            for images, labels, _ in test_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = model(images)
                _, predicted = outputs.logits.max(1)
                test_total += labels.size(0)
                test_correct += predicted.eq(labels).sum().item()
        
        test_acc = 100. * test_correct / test_total
        
        print(f"\n🎯 FINAL RESULTS:")
        print(f"   Training Time: {(time.time()-start_time)/60:.1f} minutes")
        print(f"   Best Validation Accuracy: {best_val_acc:.2f}%")
        print(f"   Test Accuracy: {test_acc:.2f}%")
        
        return {
            'val_accuracy': best_val_acc,
            'test_accuracy': test_acc,
            'training_time_min': (time.time()-start_time)/60
        }
    
    def train_wbc_classification(self):
        """Train WBC classification model"""
        print("\n" + "="*70)
        print("⚪ TRAINING WBC CLASSIFICATION MODEL")
        print("="*70)
        
        start_time = time.time()
        
        # Prepare transforms
        train_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(p=0.4),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Load dataset
        dataset = BloodSmearDataset(
            self.dataset_path, 
            classes=self.wbc_classes,
            transform=train_transform,
            security_validator=self.security_validator
        )
        
        # Split dataset
        train_size = int(0.8 * len(dataset))
        val_size = int(0.1 * len(dataset))
        test_size = len(dataset) - train_size - val_size
        
        train_dataset, temp_dataset = random_split(dataset, [train_size, len(dataset) - train_size])
        val_dataset, test_dataset = random_split(temp_dataset, [val_size, test_size])
        
        # Create data loaders
        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=4)
        val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)
        test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
        
        print(f"📊 Dataset Statistics:")
        print(f"   Total WBC images: {len(dataset):,}")
        
        # Initialize model
        config = ViTConfig.from_pretrained('WinKawaks/vit-small-patch16-224')
        config.num_labels = len(self.wbc_classes)
        model = ViTForImageClassification(config)
        model = model.to(self.device)
        
        # Training setup
        optimizer = optim.AdamW(model.parameters(), lr=1e-4)
        criterion = nn.CrossEntropyLoss()
        
        # Training loop
        best_val_acc = 0.0
        epochs = 8
        
        for epoch in range(epochs):
            # Training
            model.train()
            correct = 0
            total = 0
            
            for images, labels, _ in train_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                
                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs.logits, labels)
                loss.backward()
                optimizer.step()
                
                _, predicted = outputs.logits.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
            
            # Validation
            model.eval()
            val_correct = 0
            val_total = 0
            
            with torch.no_grad():
                for images, labels, _ in val_loader:
                    images, labels = images.to(self.device), labels.to(self.device)
                    outputs = model(images)
                    _, predicted = outputs.logits.max(1)
                    val_total += labels.size(0)
                    val_correct += predicted.eq(labels).sum().item()
            
            train_acc = 100. * correct / total
            val_acc = 100. * val_correct / val_total
            
            print(f"✅ Epoch {epoch+1}: Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}%")
            
            # Save best model
            if val_acc > best_val_acc:
                best_val_acc = val_acc
                model_save_path = os.path.join(self.models_dir, "wbc_vit_final")
                model.save_pretrained(model_save_path)
                print(f"💾 Best model saved! Val Acc: {val_acc:.2f}%")
        
        # Final evaluation
        model.eval()
        test_correct = 0
        test_total = 0
        
        with torch.no_grad():
            for images, labels, _ in test_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                outputs = model(images)
                _, predicted = outputs.logits.max(1)
                test_total += labels.size(0)
                test_correct += predicted.eq(labels).sum().item()
        
        test_acc = 100. * test_correct / test_total
        
        print(f"\n🎯 FINAL RESULTS:")
        print(f"   Training Time: {(time.time()-start_time)/60:.1f} minutes")
        print(f"   Best Validation Accuracy: {best_val_acc:.2f}%")
        print(f"   Test Accuracy: {test_acc:.2f}%")
        
        return {
            'val_accuracy': best_val_acc,
            'test_accuracy': test_acc,
            'training_time_min': (time.time()-start_time)/60
        }
    
    def train_yolo_cell_detector(self):
        """Train YOLO for cell detection"""
        print("\n" + "="*70)
        print("🔍 TRAINING YOLO CELL DETECTOR")
        print("="*70)
        
        start_time = time.time()
        
        # Prepare YOLO dataset structure
        self._prepare_yolo_dataset()
        
        # Load YOLO model
        model = YOLO('yolov8m.pt')  # Medium size for good accuracy/speed balance
        
        # Train the model
        results = model.train(
            data='datasets/cell_detection/data.yaml',
            epochs=50,
            imgsz=640,
            batch=16,
            patience=10,
            name='blood_cell_detector_final',
            device=0,  # Use GPU
            workers=4,
            amp=True,
            save=True,
            exist_ok=True,
            verbose=False
        )
        
        # Save best model
        best_model_path = "runs/detect/blood_cell_detector_final/weights/best.pt"
        yolo_save_path = os.path.join(self.models_dir, "yolo_final.pt")
        
        if os.path.exists(best_model_path):
            import shutil
            shutil.copy(best_model_path, yolo_save_path)
            print(f"💾 YOLO model saved to: {yolo_save_path}")
        
        training_time = (time.time() - start_time) / 60
        
        print(f"\n🎯 YOLO TRAINING COMPLETE!")
        print(f"⏱️  Training time: {training_time:.1f} minutes")
        
        return {
            'model_path': yolo_save_path,
            'training_time_min': training_time
        }
    
    def _prepare_yolo_dataset(self):
        """Prepare YOLO dataset structure"""
        print("📁 Preparing YOLO dataset...")
        
        # Create directory structure
        yolo_dirs = ['images/train', 'images/val', 'labels/train', 'labels/val']
        for dir_path in yolo_dirs:
            os.makedirs(f'datasets/cell_detection/{dir_path}', exist_ok=True)
        
        # Create data.yaml
        data_yaml = """path: datasets/cell_detection
train: images/train
val: images/val

nc: 3
names: 
  0: RBC
  1: WBC
  2: Platelet
"""
        
        with open('datasets/cell_detection/data.yaml', 'w') as f:
            f.write(data_yaml)
        
        print("✅ YOLO dataset structure created")
    
    def train_complete_system(self):
        """Train complete system"""
        print("\n" + "="*70)
        print("🎯 COMPLETE BLOOD SMEAR ANALYSIS SYSTEM TRAINING")
        print("="*70)
        
        total_start = time.time()
        
        results = {}
        
        # 1. Train Disease Classification
        print("\n1️⃣ PHASE 1: DISEASE CLASSIFICATION")
        disease_results = self.train_disease_classification()
        results['disease'] = disease_results
        
        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # 2. Train WBC Classification
        print("\n2️⃣ PHASE 2: WBC CLASSIFICATION")
        wbc_results = self.train_wbc_classification()
        results['wbc'] = wbc_results
        
        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # 3. Train YOLO Detector
        print("\n3️⃣ PHASE 3: CELL DETECTION")
        yolo_results = self.train_yolo_cell_detector()
        results['yolo'] = yolo_results
        
        total_time = (time.time() - total_start) / 3600
        
        print(f"\n🎉 ALL MODELS TRAINED SUCCESSFULLY!")
        print(f"⏱️  Total Training Time: {total_time:.2f} hours")
        
        # Save results
        summary = {
            'total_training_hours': total_time,
            'completion_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'device': str(self.device),
            'results': results,
            'model_paths': {
                'disease_vit': os.path.join(self.models_dir, "disease_vit_final"),
                'wbc_vit': os.path.join(self.models_dir, "wbc_vit_final"),
                'yolo': os.path.join(self.models_dir, "yolo_final.pt")
            }
        }
        
        with open(os.path.join(self.results_dir, 'training_summary.json'), 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n💾 Models saved to: {self.models_dir}")
        print(f"📊 Results saved to: {self.results_dir}")
        
        return results

# ============================================================================
# 6. REAL-TIME INFERENCE SYSTEM
# ============================================================================

class RealTimeBloodAnalyzer:
    """Real-time blood smear analysis with all features"""
    
    def __init__(self, models_dir="trained_models"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.models_dir = models_dir
        
        # Initialize components
        self.security_validator = BloodSecurityValidator()
        self.color_analyzer = EnhancedColorAnalyzer()
        self.cell_counter = RealTimeCellCounter()
        
        # Load models
        self._load_models()
        
        print(f"🚀 REAL-TIME ANALYZER LOADED on: {self.device}")
    
    def _load_models(self):
        """Load all trained models"""
        try:
            # Load Disease ViT
            disease_path = os.path.join(self.models_dir, "disease_vit_final")
            if os.path.exists(disease_path):
                config = ViTConfig.from_pretrained(disease_path)
                self.disease_model = ViTForImageClassification(config)
                self.disease_model.load_state_dict(
                    torch.load(os.path.join(disease_path, "pytorch_model.bin"), map_location=self.device)
                )
                self.disease_model = self.disease_model.to(self.device)
                self.disease_model.eval()
                print("✅ Disease model loaded")
            else:
                print("⚠️ Disease model not found")
                self.disease_model = None
            
            # Load WBC ViT
            wbc_path = os.path.join(self.models_dir, "wbc_vit_final")
            if os.path.exists(wbc_path):
                config = ViTConfig.from_pretrained(wbc_path)
                self.wbc_model = ViTForImageClassification(config)
                self.wbc_model.load_state_dict(
                    torch.load(os.path.join(wbc_path, "pytorch_model.bin"), map_location=self.device)
                )
                self.wbc_model = self.wbc_model.to(self.device)
                self.wbc_model.eval()
                print("✅ WBC model loaded")
            else:
                print("⚠️ WBC model not found")
                self.wbc_model = None
            
            # Load YOLO
            yolo_path = os.path.join(self.models_dir, "yolo_final.pt")
            if os.path.exists(yolo_path):
                self.yolo_model = YOLO(yolo_path)
                print("✅ YOLO model loaded")
            else:
                print("⚠️ YOLO model not found, using pretrained")
                self.yolo_model = YOLO('yolov8n.pt')
                
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            # Initialize with pretrained models
            self.disease_model = None
            self.wbc_model = None
            self.yolo_model = YOLO('yolov8n.pt')
    
    def analyze_complete(self, image_path):
        """
        Complete real-time analysis of blood smear
        Returns all features in real-time
        """
        print(f"\n🔬 ANALYZING: {os.path.basename(image_path)}")
        print("="*70)
        
        start_time = time.time()
        
        # 1. Security Validation
        print("\n1️⃣ SECURITY VALIDATION:")
        is_valid, message = self.security_validator.validate_image_file(image_path)
        if not is_valid:
            return {"error": message}
        print(f"   {message}")
        
        # 2. Load Image
        try:
            img = Image.open(image_path).convert('RGB')
            img_array = np.array(img)
            print(f"✅ Image loaded: {img.size[0]}×{img.size[1]} pixels")
        except Exception as e:
            return {"error": f"Cannot load image: {str(e)}"}
        
        results = {
            'security': message,
            'image_info': {
                'dimensions': f"{img.size[0]}×{img.size[1]}",
                'size_bytes': os.path.getsize(image_path)
            }
        }
        
        # 3. Enhanced Color Analysis (Real-time)
        print("\n2️⃣ ENHANCED COLOR ANALYSIS:")
        color_results = self.color_analyzer.analyze_comprehensive_color(img_array)
        results['color_analysis'] = color_results
        print(f"   ✅ Completed in {color_results['processing_time_ms']:.1f} ms")
        
        # 4. Disease Classification (Real-time)
        print("\n3️⃣ DISEASE CLASSIFICATION:")
        if self.disease_model:
            disease_result = self._classify_disease(img)
            results['disease_classification'] = disease_result
            print(f"   Primary: {disease_result['primary_diagnosis']}")
            print(f"   Confidence: {disease_result['confidence']:.1f}%")
        else:
            results['disease_classification'] = {"error": "Model not loaded"}
        
        # 5. WBC Classification (Real-time)
        print("\n4️⃣ WBC CLASSIFICATION:")
        if self.wbc_model:
            wbc_result = self._classify_wbc(img)
            results['wbc_classification'] = wbc_result
            print(f"   Detected: {wbc_result['detected_types']}")
        else:
            results['wbc_classification'] = {"error": "Model not loaded"}
        
        # 6. Cell Counting (Real-time)
        print("\n5️⃣ CELL COUNTING:")
        cell_count_result = self.cell_counter.count_cells_realtime(image_path, self.yolo_model)
        if cell_count_result:
            results['cell_counting'] = cell_count_result
            print(f"   Processing time: {cell_count_result['processing_time_ms']:.1f} ms")
        else:
            results['cell_counting'] = {"error": "Cell counting failed"}
        
        # 7. Complete Analysis Report
        print("\n6️⃣ COMPLETE ANALYSIS REPORT:")
        complete_report = self._generate_complete_report(results)
        results['complete_report'] = complete_report
        
        total_time = (time.time() - start_time) * 1000
        results['total_processing_time_ms'] = float(total_time)
        
        print(f"\n🎯 ANALYSIS COMPLETE!")
        print(f"⏱️  Total processing time: {total_time:.1f} ms")
        print(f"📊 Results saved to analysis_results.json")
        
        # Save results
        with open('analysis_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return results
    
    def _classify_disease(self, img):
        """Classify disease from image"""
        try:
            # Preprocess
            transform = transforms.Compose([
                transforms.Resize((256, 256)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            input_tensor = transform(img).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.disease_model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=1)
                probs = probabilities[0].cpu().numpy()
            
            # Disease classes
            diseases = ['Leishmania_2701', 'Babesia_1173', 'Trichomonad_10134',
                       'Trypanosome_2385', 'malaria Parasitized', 'malaria Uninfected']
            
            # Get top prediction
            top_idx = np.argmax(probs)
            primary = diseases[top_idx]
            confidence = probs[top_idx] * 100
            
            # Get top 3 probabilities
            top_indices = np.argsort(probs)[-3:][::-1]
            top_probabilities = []
            
            for idx in top_indices:
                top_probabilities.append({
                    'disease': diseases[idx],
                    'probability': float(probs[idx] * 100)
                })
            
            return {
                'primary_diagnosis': primary,
                'confidence': float(confidence),
                'top_probabilities': top_probabilities,
                'all_probabilities': {diseases[i]: float(probs[i] * 100) for i in range(len(diseases))}
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def _classify_wbc(self, img):
        """Classify WBC types"""
        try:
            # Preprocess
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            input_tensor = transform(img).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.wbc_model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=1)
                probs = probabilities[0].cpu().numpy()
            
            # WBC classes
            wbc_types = ['neutrophil', 'lymphocyte', 'monocyte', 'eosinophil', 'basophil']
            
            # Get detected types (probability > 10%)
            detected = []
            for i, wbc_type in enumerate(wbc_types):
                if probs[i] * 100 > 10:
                    detected.append({
                        'type': wbc_type,
                        'percentage': float(probs[i] * 100)
                    })
            
            # Sort by percentage
            detected.sort(key=lambda x: x['percentage'], reverse=True)
            
            return {
                'detected_types': detected,
                'all_probabilities': {wbc_types[i]: float(probs[i] * 100) for i in range(len(wbc_types))}
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def _generate_complete_report(self, analysis_results):
        """Generate complete analysis report"""
        report = {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'summary': {}
        }
        
        # Disease summary
        if 'disease_classification' in analysis_results and 'primary_diagnosis' in analysis_results['disease_classification']:
            disease = analysis_results['disease_classification']
            report['summary']['disease'] = {
                'primary': disease['primary_diagnosis'],
                'confidence': disease['confidence']
            }
        
        # Cell count summary
        if 'cell_counting' in analysis_results:
            cell_count = analysis_results['cell_counting']
            if 'concentrations_per_uL' in cell_count:
                conc = cell_count['concentrations_per_uL']
                report['summary']['cell_counts'] = {
                    'RBC': f"{conc.get('RBC', 0):,} cells/µL ({conc.get('RBC', 0)/1e6:.2f} million/µL)",
                    'WBC': f"{conc.get('WBC', 0):,} cells/µL ({conc.get('WBC', 0)/1000:.1f} thousand/µL)",
                    'Platelet': f"{conc.get('Platelet', 0):,} cells/µL ({conc.get('Platelet', 0)/1000:.0f} thousand/µL)"
                }
        
        # Color analysis summary
        if 'color_analysis' in analysis_results:
            color = analysis_results['color_analysis']
            if 'dominant_colors' in color and len(color['dominant_colors']) > 0:
                top_color = color['dominant_colors'][0]
                report['summary']['dominant_color'] = {
                    'name': top_color['name'],
                    'percentage': top_color['percentage'],
                    'hex': top_color['hex']
                }
            
            if 'staining_quality' in color:
                staining = color['staining_quality']
                report['summary']['staining_quality'] = {
                    'grade': staining['grade'],
                    'score': staining['overall_quality']
                }
        
        report['processing_time_ms'] = analysis_results.get('total_processing_time_ms', 0)
        
        return report

# ============================================================================
# 7. MAIN EXECUTION
# ============================================================================

def main():
    """Main execution function"""
    print("="*80)
    print("🩸 COMPLETE BLOOD SMEAR ANALYSIS SYSTEM")
    print("="*80)
    
    # Configuration
    DATASET_PATH = r"C:\Users\SIVA\Desktop\datasets"
    MODELS_DIR = "trained_models"
    
    print(f"📁 Dataset path: {DATASET_PATH}")
    print(f"💾 Models directory: {MODELS_DIR}")
    
    # Ask for mode
    print("\n🎯 SELECT MODE:")
    print("1. Train Complete System")
    print("2. Real-time Analysis")
    print("3. Both (Train then Analyze)")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        # Training mode
        print("\n🚀 STARTING TRAINING...")
        trainer = CompleteBloodSmearTrainer(DATASET_PATH)
        results = trainer.train_complete_system()
        
        print("\n📊 TRAINING COMPLETE SUMMARY:")
        print(f"Disease Model: {results.get('disease', {}).get('test_accuracy', 0):.2f}% accuracy")
        print(f"WBC Model: {results.get('wbc', {}).get('test_accuracy', 0):.2f}% accuracy")
        print(f"YOLO Model: Saved to {results.get('yolo', {}).get('model_path', 'N/A')}")
    
    elif choice == "2":
        # Analysis mode
        print("\n🔍 REAL-TIME ANALYSIS MODE")
        
        # Initialize analyzer
        analyzer = RealTimeBloodAnalyzer(MODELS_DIR)
        
        # Get image path
        image_path = input("\nEnter image path for analysis: ").strip()
        
        if not os.path.exists(image_path):
            print(f"❌ Image not found: {image_path}")
            return
        
        # Run analysis
        results = analyzer.analyze_complete(image_path)
        
        # Display summary
        if 'complete_report' in results:
            report = results['complete_report']['summary']
            
            print("\n" + "="*80)
            print("📋 ANALYSIS SUMMARY")
            print("="*80)
            
            if 'disease' in report:
                print(f"\n🦠 DISEASE DIAGNOSIS:")
                print(f"   Primary: {report['disease']['primary']}")
                print(f"   Confidence: {report['disease']['confidence']:.1f}%")
            
            if 'cell_counts' in report:
                print(f"\n🔢 CELL COUNTS:")
                print(f"   RBC: {report['cell_counts']['RBC']}")
                print(f"   WBC: {report['cell_counts']['WBC']}")
                print(f"   Platelets: {report['cell_counts']['Platelet']}")
            
            if 'staining_quality' in report:
                print(f"\n🎨 STAINING QUALITY:")
                print(f"   Grade: {report['staining_quality']['grade']}")
                print(f"   Score: {report['staining_quality']['score']:.1f}/100")
            
            print(f"\n⏱️  Total processing time: {results['total_processing_time_ms']:.1f} ms")
    
    elif choice == "3":
        # Both modes
        print("\n🚀 STARTING COMPLETE PROCESS...")
        
        # 1. Training
        print("\n" + "="*80)
        print("PHASE 1: TRAINING")
        print("="*80)
        trainer = CompleteBloodSmearTrainer(DATASET_PATH)
        training_results = trainer.train_complete_system()
        
        # 2. Analysis
        print("\n" + "="*80)
        print("PHASE 2: REAL-TIME ANALYSIS")
        print("="*80)
        
        analyzer = RealTimeBloodAnalyzer(MODELS_DIR)
        
        # Test on sample image
        sample_image = input("\nEnter image path for analysis (or press Enter for default): ").strip()
        
        if not sample_image:
            # Try to find a sample image
            for disease in trainer.disease_classes:
                disease_path = os.path.join(DATASET_PATH, disease)
                if os.path.exists(disease_path):
                    images = glob.glob(os.path.join(disease_path, "*.jpg"))[:1]
                    if images:
                        sample_image = images[0]
                        break
        
        if sample_image and os.path.exists(sample_image):
            print(f"🔍 Analyzing: {os.path.basename(sample_image)}")
            analysis_results = analyzer.analyze_complete(sample_image)
            
            # Save combined results
            combined = {
                'training': training_results,
                'analysis': analysis_results
            }
            
            with open('combined_results.json', 'w') as f:
                json.dump(combined, f, indent=2)
            
            print(f"\n💾 Combined results saved to: combined_results.json")
        else:
            print("⚠️ No sample image found for analysis")
    
    else:
        print("❌ Invalid choice. Please enter 1, 2, or 3.")
    
    print("\n" + "="*80)
    print("🎉 PROCESS COMPLETED SUCCESSFULLY!")
    print("="*80)

# Run the system
if __name__ == "__main__":
    # Check GPU
    print(f"🎯 PyTorch version: {torch.__version__}")
    print(f"🎯 CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"🎯 GPU: {torch.cuda.get_device_name(0)}")
        print(f"🎯 VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Run main function
    main()