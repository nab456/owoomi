-- Permet à tout utilisateur authentifié de créer une entreprise lors de l'inscription
CREATE POLICY "Authenticated users can create entreprise"
  ON entreprises FOR INSERT
  TO authenticated
  WITH CHECK (true);
