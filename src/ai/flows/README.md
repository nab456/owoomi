# Genkit Flows

This directory is where all Genkit flows for the application are stored.

Each file in this directory should typically represent a single, self-contained flow. This includes:

- The Zod schemas for the flow's input and output.
- The Genkit prompt definition.
- The Genkit flow definition (`ai.defineFlow`).
- An exported wrapper function that invokes the flow.

Flows defined here are imported into `src/ai/dev.ts` to be registered with the Genkit development server.
