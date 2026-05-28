-- RPC function used by transfererStock() in src/services/depot.ts
-- Atomically adjusts stock in stock_depots for a given depot+produit combination.
-- Negative delta decrements, positive delta increments.
CREATE OR REPLACE FUNCTION adjust_depot_stock(
  p_depot_id UUID,
  p_produit_id UUID,
  p_entreprise_id UUID,
  p_delta INTEGER
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stock_depots (depot_id, produit_id, entreprise_id, quantite)
  VALUES (p_depot_id, p_produit_id, p_entreprise_id, GREATEST(0, p_delta))
  ON CONFLICT (depot_id, produit_id) DO UPDATE
    SET quantite = GREATEST(0, stock_depots.quantite + p_delta);
END;
$$;
