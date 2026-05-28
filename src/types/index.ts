import { z } from 'zod';

// ============================================================
// Abonnement
// ============================================================
export const AbonnementLimitesSchema = z.object({
  maxMembres: z.number(),
  maxProduits: z.number(),
  maxCommerciaux: z.optional(z.number()),
});

export const AbonnementSchema = z.object({
  id: z.string(),
  nom: z.string(),
  prix: z.number(),
  description: z.string(),
  features: z.array(z.string()),
  limites: AbonnementLimitesSchema,
});
export type Abonnement = z.infer<typeof AbonnementSchema>;

// ============================================================
// Entreprise
// ============================================================
export const EntrepriseLimitesSchema = z.object({
  maxMembres: z.number(),
  maxProduits: z.number(),
  maxCommerciaux: z.optional(z.number()),
  features: z.array(z.string()),
});

export const EntrepriseSchema = z.object({
  id: z.string(),
  nom: z.string(),
  statut: z.enum(['actif', 'suspendu']),
  abonnement: z.string(),
  dateSouscription: z.date(),
  dateExpiration: z.date(),
  limites: EntrepriseLimitesSchema,
});
export type Entreprise = z.infer<typeof EntrepriseSchema>;

// ============================================================
// Utilisateur
// ============================================================
export const UtilisateurSchema = z.object({
  id: z.string(),
  nom: z.string(),
  email: z.string().email(),
  entrepriseId: z.string(),
  role: z.enum(['PDG', 'comptable', 'commercial', 'gestionnaire']),
  statut: z.enum(['actif', 'inactif']),
});
export type Utilisateur = z.infer<typeof UtilisateurSchema>;

// ============================================================
// Catégorie
// ============================================================
export const CategorieSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  nom: z.string(),
  description: z.string().optional(),
  nbProduits: z.number().optional(),
});
export type Categorie = z.infer<typeof CategorieSchema>;

// ============================================================
// Produit
// ============================================================
export const ProduitSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  nom: z.string(),
  sku: z.string().optional(),
  categorieId: z.string().optional(),
  categorieNom: z.string().optional(),
  prix: z.number(),
  stock: z.number(),
  stockMinimum: z.number().default(5),
  imageUrl: z.string().optional(),
});
export type Produit = z.infer<typeof ProduitSchema>;

// ============================================================
// Mouvement de stock
// ============================================================
export const MouvementStockSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  produitId: z.string(),
  produitNom: z.string().optional(),
  type: z.enum(['entree', 'sortie', 'ajustement']),
  quantite: z.number(),
  prixUnitaire: z.number().optional(),
  fournisseurId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userNom: z.string().optional(),
  createdAt: z.string().optional(),
});
export type MouvementStock = z.infer<typeof MouvementStockSchema>;

// ============================================================
// Client
// ============================================================
export const ClientSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  nom: z.string(),
  type: z.enum(['particulier', 'revendeur', 'entreprise']),
  telephone: z.string().optional(),
  email: z.string().optional(),
  adresse: z.string().optional(),
  notes: z.string().optional(),
  solde: z.number().default(0),
  nbVentes: z.number().optional(),
  derniereVente: z.string().optional(),
});
export type Client = z.infer<typeof ClientSchema>;

// ============================================================
// Fournisseur
// ============================================================
export const FournisseurSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  nom: z.string(),
  telephone: z.string().optional(),
  email: z.string().optional(),
  adresse: z.string().optional(),
  notes: z.string().optional(),
  solde: z.number().default(0),
  nbPaiements: z.number().optional(),
});
export type Fournisseur = z.infer<typeof FournisseurSchema>;

// ============================================================
// Vente
// ============================================================
export const VenteItemSchema = z.object({
  id: z.string().optional(),
  venteId: z.string().optional(),
  entrepriseId: z.string().optional(),
  produitId: z.string().optional(),
  nomProduit: z.string(),
  quantite: z.number(),
  prixUnitaire: z.number(),
  remise: z.number().default(0),
  total: z.number(),
});
export type VenteItem = z.infer<typeof VenteItemSchema>;

export const PaiementSchema = z.object({
  id: z.string().optional(),
  venteId: z.string(),
  entrepriseId: z.string().optional(),
  montant: z.number(),
  mode: z.string(),
  reference: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Paiement = z.infer<typeof PaiementSchema>;

export const VenteSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  reference: z.string(),
  type: z.enum(['ticket', 'facture']),
  clientId: z.string().optional(),
  clientNom: z.string().optional(),
  vendeurId: z.string().optional(),
  vendeurNom: z.string().optional(),
  statut: z.enum(['en_attente', 'valide', 'paye', 'annule']),
  total: z.number(),
  montantPaye: z.number(),
  notes: z.string().optional(),
  items: z.array(VenteItemSchema).optional(),
  paiements: z.array(PaiementSchema).optional(),
  createdAt: z.string().optional(),
});
export type Vente = z.infer<typeof VenteSchema>;

// ============================================================
// Devis
// ============================================================
export const DevisItemSchema = z.object({
  id: z.string().optional(),
  devisId: z.string().optional(),
  entrepriseId: z.string().optional(),
  produitId: z.string().optional(),
  nomProduit: z.string(),
  quantite: z.number(),
  prixUnitaire: z.number(),
  remise: z.number().default(0),
  total: z.number(),
});
export type DevisItem = z.infer<typeof DevisItemSchema>;

export const DevisSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  reference: z.string(),
  clientId: z.string().optional(),
  clientNom: z.string().optional(),
  vendeurId: z.string().optional(),
  statut: z.enum(['brouillon', 'envoye', 'accepte', 'refuse', 'expire']),
  total: z.number(),
  dateEcheance: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(DevisItemSchema).optional(),
  createdAt: z.string().optional(),
});
export type Devis = z.infer<typeof DevisSchema>;

// ============================================================
// Bon de livraison
// ============================================================
export const BonLivraisonSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  reference: z.string(),
  venteId: z.string().optional(),
  clientId: z.string().optional(),
  clientNom: z.string().optional(),
  statut: z.enum(['en_preparation', 'livre', 'annule']),
  nbArticles: z.number().optional(),
  createdBy: z.string().optional(),
  createdByNom: z.string().optional(),
  createdAt: z.string().optional(),
});
export type BonLivraison = z.infer<typeof BonLivraisonSchema>;

// ============================================================
// Dépense
// ============================================================
export const DepenseSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  reference: z.string(),
  date: z.string(),
  montant: z.number(),
  categorie: z.string(),
  fournisseurId: z.string().optional(),
  fournisseurNom: z.string().optional(),
  modePaiement: z.string(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userNom: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Depense = z.infer<typeof DepenseSchema>;

// ============================================================
// Entrée financière
// ============================================================
export const EntreeSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  reference: z.string(),
  date: z.string(),
  montant: z.number(),
  categorie: z.string(),
  modePaiement: z.string(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Entree = z.infer<typeof EntreeSchema>;

// ============================================================
// Transaction de caisse
// ============================================================
export const TransactionCaisseSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  type: z.enum(['entree', 'sortie', 'transfert']),
  montant: z.number(),
  modeSource: z.string(),
  modeDestination: z.string().optional(),
  description: z.string().optional(),
  venteId: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
});
export type TransactionCaisse = z.infer<typeof TransactionCaisseSchema>;

// ============================================================
// Paiement fournisseur
// ============================================================
export const PaiementFournisseurSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  fournisseurId: z.string(),
  montant: z.number(),
  mode: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
});
export type PaiementFournisseur = z.infer<typeof PaiementFournisseurSchema>;

// ============================================================
// Permission utilisateur
// ============================================================
export const PermissionUtilisateurSchema = z.object({
  id: z.string(),
  utilisateurId: z.string(),
  entrepriseId: z.string(),
  permission: z.string(),
  valeur: z.boolean(),
});
export type PermissionUtilisateur = z.infer<typeof PermissionUtilisateurSchema>;

// ============================================================
// Paramètres entreprise
// ============================================================
export const ParametresEntrepriseSchema = z.object({
  id: z.string(),
  entrepriseId: z.string(),
  slogan: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  siret: z.string().optional(),
  numeroTva: z.string().optional(),
  capitalSocial: z.number().optional(),
});
export type ParametresEntreprise = z.infer<typeof ParametresEntrepriseSchema>;
