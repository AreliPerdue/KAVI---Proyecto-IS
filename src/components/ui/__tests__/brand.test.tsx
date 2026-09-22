/**
 * Piezas de marca. Son la unica parte de la app que usa fuentes distintas a la
 * del sistema (NFR-19), y el eslogan tiene un minimo de tamano que respetar
 * (kavi-design §2: nada de texto por debajo de 12 px).
 */
import { render, screen } from '@testing-library/react-native';

import { DimensionDots } from '@/components/ui/dimension-dots';
import { Wordmark } from '@/components/ui/wordmark';
import { DIMENSIONS } from '@/constants/dimensions';
import { BrandFonts, SLOGAN } from '@/constants/theme';

const estiloDe = (n: { props: { style?: unknown } }) =>
  Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));

describe('Wordmark', () => {
  it('muestra el wordmark', async () => {
    await render(<Wordmark />);
    expect(screen.getByText('KAVI')).toBeTruthy();
  });

  it('usa la fuente de marca, no la del sistema', async () => {
    await render(<Wordmark />);
    expect(estiloDe(screen.getByText('KAVI')).fontFamily).toBe(BrandFonts.wordmark);
  });

  it('sin pedirlo no muestra el eslogan', async () => {
    await render(<Wordmark />);
    expect(screen.queryByText(SLOGAN)).toBeNull();
  });

  it('con slogan lo muestra en su propia fuente', async () => {
    await render(<Wordmark slogan />);
    expect(estiloDe(screen.getByText(SLOGAN)).fontFamily).toBe(BrandFonts.slogan);
  });

  it('el tamano escala el wordmark', async () => {
    await render(<Wordmark size={48} />);
    expect(estiloDe(screen.getByText('KAVI')).fontSize).toBe(48);
  });

  it('apilado el eslogan escala en proporcion y queda pequeno', async () => {
    await render(<Wordmark size={100} slogan />);
    expect(estiloDe(screen.getByText(SLOGAN)).fontSize).toBe(32);
  });

  it('en linea respeta el minimo de 12 px aunque el wordmark sea chico', async () => {
    await render(<Wordmark size={26} slogan sloganInline />);
    expect(estiloDe(screen.getByText(SLOGAN)).fontSize).toBe(12);
  });

  it('en linea no encoge un eslogan que ya supera el minimo', async () => {
    await render(<Wordmark size={100} slogan sloganInline />);
    expect(estiloDe(screen.getByText(SLOGAN)).fontSize).toBe(32);
  });

  it('el eslogan puede llevar su propio color', async () => {
    await render(<Wordmark slogan sloganColor="textSecondary" />);
    const wordmark = estiloDe(screen.getByText('KAVI')).color;
    const eslogan = estiloDe(screen.getByText(SLOGAN)).color;
    expect(eslogan).not.toBe(wordmark);
  });

  it('sin sloganColor ambos comparten color', async () => {
    await render(<Wordmark slogan />);
    expect(estiloDe(screen.getByText(SLOGAN)).color).toBe(estiloDe(screen.getByText('KAVI')).color);
  });
});

describe('DimensionDots', () => {
  it('pinta un punto por cada dimension del bienestar', async () => {
    const r = await render(<DimensionDots />);
    const json = JSON.stringify(r.toJSON());
    for (const d of DIMENSIONS) expect(json).toContain(d.color);
  });

  it('son siete', async () => {
    expect(DIMENSIONS).toHaveLength(7);
  });

  it('acepta un tamano propio', async () => {
    const r = await render(<DimensionDots size={6} />);
    expect(JSON.stringify(r.toJSON())).toContain('"width":6');
  });

  it('es decorativo: se oculta a los lectores de pantalla', async () => {
    const r = await render(<DimensionDots />);
    expect(JSON.stringify(r.toJSON())).toContain('"accessible":false');
  });
});
