/*
  # Blood Smear AI Analysis Platform - Database Schema

  ## Overview
  This migration creates the complete database schema for the Blood Smear AI Analysis Platform,
  including tables for analysis records, disease classifications, and cell counts.

  ## New Tables

  ### 1. `analyses`
  Stores all blood smear analysis records with metadata and results
  - `id` (uuid, primary key) - Unique identifier for each analysis
  - `user_id` (uuid, foreign key) - References auth.users, the user who performed the analysis
  - `image_url` (text) - Storage path or URL to the blood smear image
  - `status` (text) - Analysis status: 'pending', 'processing', 'completed', 'failed'
  - `disease_detected` (text) - Primary disease classification result
  - `confidence_score` (numeric) - AI confidence level (0-100)
  - `rbc_count` (integer) - Red blood cell count
  - `wbc_count` (integer) - White blood cell count
  - `platelet_count` (integer) - Platelet count
  - `analysis_notes` (text) - Additional clinical notes or observations
  - `created_at` (timestamptz) - Timestamp when analysis was created
  - `completed_at` (timestamptz) - Timestamp when analysis was completed

  ### 2. `disease_classifications`
  Stores detailed classification results for each disease type
  - `id` (uuid, primary key) - Unique identifier
  - `analysis_id` (uuid, foreign key) - References analyses table
  - `disease_name` (text) - Name of the disease (e.g., 'Malaria', 'Babesia', etc.)
  - `probability` (numeric) - Probability score (0-100)
  - `cell_abnormalities` (jsonb) - Detailed abnormality data in JSON format
  - `created_at` (timestamptz) - Timestamp

  ### 3. `cell_counts`
  Stores detailed cell type breakdowns
  - `id` (uuid, primary key) - Unique identifier
  - `analysis_id` (uuid, foreign key) - References analyses table
  - `cell_type` (text) - Type of cell (e.g., 'neutrophil', 'lymphocyte', 'monocyte', etc.)
  - `count` (integer) - Number of cells detected
  - `percentage` (numeric) - Percentage of total cells
  - `abnormal_count` (integer) - Number of abnormal cells detected
  - `created_at` (timestamptz) - Timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only view and manage their own analysis records
  - Authenticated access required for all operations

  ### Policies
  - SELECT: Users can view their own data
  - INSERT: Users can create their own analysis records
  - UPDATE: Users can update their own records
  - DELETE: Users can delete their own records

  ## Important Notes

  1. **Data Integrity**: Foreign key constraints ensure referential integrity
  2. **Indexing**: Indexes on user_id and analysis_id for fast queries
  3. **Timestamps**: All tables include created_at for audit trails
  4. **JSONB Storage**: cell_abnormalities uses JSONB for flexible data structure
  5. **Cascading Deletes**: When an analysis is deleted, related classifications and cell counts are automatically removed
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  disease_detected text,
  confidence_score numeric,
  rbc_count integer,
  wbc_count integer,
  platelet_count integer,
  analysis_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS disease_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  disease_name text NOT NULL,
  probability numeric NOT NULL,
  cell_abnormalities jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS cell_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  cell_type text NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  percentage numeric DEFAULT 0 NOT NULL,
  abnormal_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disease_classifications_analysis_id ON disease_classifications(analysis_id);
CREATE INDEX IF NOT EXISTS idx_cell_counts_analysis_id ON cell_counts(analysis_id);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own disease classifications"
  ON disease_classifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = disease_classifications.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create disease classifications for own analyses"
  ON disease_classifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = disease_classifications.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update disease classifications for own analyses"
  ON disease_classifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = disease_classifications.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = disease_classifications.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete disease classifications for own analyses"
  ON disease_classifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = disease_classifications.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own cell counts"
  ON cell_counts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_counts.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create cell counts for own analyses"
  ON cell_counts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_counts.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cell counts for own analyses"
  ON cell_counts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_counts.analysis_id
      AND analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_counts.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cell counts for own analyses"
  ON cell_counts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      WHERE analyses.id = cell_counts.analysis_id
      AND analyses.user_id = auth.uid()
    )
  );