/* Ayudas sueltas, sin dependencias del dominio. */

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

export const hoy = () => new Date().toISOString().slice(0, 10);

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const iniciales = (n = '') =>
  n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* Vibración: se queda callada si el aparato no la soporta. */
export const vibra = (p) => { try { navigator.vibrate?.(p); } catch { } };

/* Recorta la foto a un cuadrado y la baja a jpeg para no llenar el almacenamiento. */
export function comprimirFoto(file, lado = 256) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('lectura'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('imagen'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const cv = document.createElement('canvas');
        cv.width = lado;
        cv.height = lado;
        cv.getContext('2d').drawImage(
          img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, lado, lado,
        );
        res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
