// Test-only stubs so importing index.ts doesn't pull npm packages
// that the Deno test runner can't auto-install.
export class Resend {
  emails = { send: async () => ({ data: null, error: null }) };
  constructor(_key?: string) {}
}
export const createClient = (_url: string, _key: string) => ({
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    upsert: async () => ({ data: null, error: null }),
  }),
  storage: { from: () => ({ upload: async () => ({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
});
export const PDFDocument = { create: async () => ({}) } as any;
export const rgb = (_r: number, _g: number, _b: number) => ({}) as any;
export const StandardFonts = { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' } as any;
