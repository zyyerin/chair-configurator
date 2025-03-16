export interface ChairParameters {
  seatWidth: number;
  seatDepth: number;
  seatHeight: number;
  backrestHeight: number;
  backrestAngle: number;
  legStyle: 'modern' | 'classic' | 'industrial';
  material: 'titanium' | 'bronze' | 'plastic' | 'stainless_steel';
  color: string;
}