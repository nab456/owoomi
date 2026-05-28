'use server';
/**
 * @fileOverview Flows for super admin and company management.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
    createUtilisateur, 
    getUtilisateur,
    listUtilisateurs
} from '@/services/utilisateur';
import { 
    getAbonnement 
} from '@/services/abonnement';
import { 
    getEntreprise, 
    updateEntreprise,
    listEntreprises 
} from '@/services/entreprise';
import { EntrepriseSchema, UtilisateurSchema, type Utilisateur } from '@/types';


// Note: This flow creates a user in Firestore, but not in Firebase Auth.
// A real implementation would use the Firebase Admin SDK to create the user in both.
const CreateUserWithRoleInput = z.object({
  nom: z.string(),
  email: z.string().email(),
  entrepriseId: z.string(),
  role: z.enum(['PDG', 'comptable', 'commercial', 'gestionnaire']),
  authUid: z.string().describe("The UID from Firebase Authentication"),
});

export const createUserWithRole = ai.defineFlow(
  {
    name: 'createUserWithRole',
    inputSchema: CreateUserWithRoleInput,
    outputSchema: z.void(),
  },
  async (input) => {
    await createUtilisateur({
        id: input.authUid,
        nom: input.nom,
        email: input.email,
        entrepriseId: input.entrepriseId,
        role: input.role,
        statut: 'actif',
    });
  }
);

const AssignAbonnementInput = z.object({
  entrepriseId: z.string(),
  abonnementId: z.string().describe("e.g. 'optionA', 'optionB'"),
});

export const assignAbonnement = ai.defineFlow(
  {
    name: 'assignAbonnement',
    inputSchema: AssignAbonnementInput,
    outputSchema: z.void(),
  },
  async ({ entrepriseId, abonnementId }) => {
    const abonnement = await getAbonnement(abonnementId);
    if (!abonnement) {
      throw new Error(`Abonnement with id ${abonnementId} not found.`);
    }

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1); // Default to 1 month subscription

    await updateEntreprise(entrepriseId, {
      abonnement: abonnementId,
      limites: {
          ...abonnement.limites,
          features: abonnement.features,
      },
      dateExpiration: expirationDate,
      statut: 'actif',
    });
  }
);

const CheckAccessRightsInput = z.object({
    utilisateurId: z.string(),
    feature: z.string(),
});

const CheckAccessRightsOutput = z.object({
    hasAccess: z.boolean(),
    reason: z.string().optional(),
});

// Defines which roles can access which features.
const featureRoles: Record<string, Array<Utilisateur['role']>> = {
    dashboard: ['PDG', 'comptable', 'commercial', 'gestionnaire'],
    stock: ['PDG', 'gestionnaire'],
    ventes: ['PDG', 'comptable', 'commercial'],
    finance: ['PDG', 'comptable', 'gestionnaire'],
    equipe: ['PDG', 'gestionnaire'],
    clients: ['PDG', 'commercial'],
    fournisseurs: ['PDG', 'gestionnaire'],
    settings: ['PDG', 'gestionnaire'],
};


export const checkAccessRights = ai.defineFlow(
  {
    name: 'checkAccessRights',
    inputSchema: CheckAccessRightsInput,
    outputSchema: CheckAccessRightsOutput,
  },
  async ({ utilisateurId, feature }) => {
    const utilisateur = await getUtilisateur(utilisateurId);
    if (!utilisateur) {
      return { hasAccess: false, reason: 'Utilisateur non trouvé.' };
    }
    if (utilisateur.statut === 'inactif') {
        return { hasAccess: false, reason: "Le compte de l'utilisateur est inactif." };
    }

    const entreprise = await getEntreprise(utilisateur.entrepriseId);
    if (!entreprise) {
      return { hasAccess: false, reason: 'Entreprise non trouvée.' };
    }
    if (entreprise.statut === 'suspendu') {
        return { hasAccess: false, reason: "L'abonnement de l'entreprise est suspendu." };
    }
    if (entreprise.dateExpiration < new Date()) {
        return { hasAccess: false, reason: "L'abonnement de l'entreprise a expiré." };
    }

    if (!entreprise.limites.features.includes(feature)) {
        return { hasAccess: false, reason: `Le plan d'abonnement n'inclut pas la fonctionnalité '${feature}'.` };
    }
    
    // Check if the user's role has access to the feature
    const allowedRoles = featureRoles[feature];
    if (!allowedRoles || !allowedRoles.includes(utilisateur.role)) {
        return { hasAccess: false, reason: `Le rôle '${utilisateur.role}' n'a pas accès à la fonctionnalité '${feature}'.`};
    }

    return { hasAccess: true };
  }
);


const GetStatsOutput = z.object({
    totalEntreprises: z.number(),
    totalUtilisateurs: z.number(),
    expirationsProches: z.number(),
});

export const getStats = ai.defineFlow(
    {
      name: 'getStats',
      outputSchema: GetStatsOutput,
    },
    async () => {
        const entreprises = await listEntreprises();
        const utilisateurs = await listUtilisateurs();

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expirationsProches = entreprises.filter(e => e.dateExpiration < sevenDaysFromNow).length;

        return {
            totalEntreprises: entreprises.length,
            totalUtilisateurs: utilisateurs.length,
            expirationsProches: expirationsProches,
        };
    }
);

const ClientSafeEntrepriseSchema = EntrepriseSchema.extend({
    dateSouscription: z.string(),
    dateExpiration: z.string(),
});

export const listAllEntreprises = ai.defineFlow(
    {
      name: 'listAllEntreprises',
      outputSchema: z.array(ClientSafeEntrepriseSchema),
    },
    async () => {
      // In a real app, you would check if the caller is a super admin here
      const entreprises = await listEntreprises();
      return entreprises.map(e => ({
          ...e,
          dateSouscription: e.dateSouscription.toLocaleDateString('fr-CA'),
          dateExpiration: e.dateExpiration.toLocaleDateString('fr-CA'),
      }));
    }
  );
  
  export const listAllUtilisateurs = ai.defineFlow(
      {
          name: 'listAllUtilisateurs',
          outputSchema: z.array(UtilisateurSchema),
      },
      async () => {
          return listUtilisateurs();
      }
  );