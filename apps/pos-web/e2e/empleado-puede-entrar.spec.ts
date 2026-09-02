import { expect, test } from '@playwright/test';

/**
 * Contratar a alguien y que pueda trabajar.
 *
 * Hasta ahora no podia: el alta generaba una contrasena aleatoria de 32
 * caracteres que no se le ensenaba a nadie, y el comentario del codigo mandaba
 * al empleado a recuperarla "through the auth password-reset flow" — un flujo
 * que no existe. `change-password` exige sesion iniciada Y la contrasena
 * actual, asi que no habia forma de entrar. El dueno daba de alta a su cajero y
 * el cajero se quedaba fuera para siempre.
 *
 * Y aunque hubiera entrado tampoco habria podido cobrar: no se creaba la fila
 * de `user_locations`, asi que la sesion salia sin sucursal y el POS no tiene
 * donde vender. Poder iniciar sesion no es poder trabajar.
 */
const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';

test.describe('Un empleado nuevo puede entrar y trabajar', () => {
  test('el alta entrega credenciales que sirven', async ({ page, request }) => {
    // Sesion del dueno, por API, para no depender del formulario de login.
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'owner@coffeedemo.mx', password: 'password123' },
    });
    expect(login.ok(), 'el dueno debe poder entrar').toBeTruthy();
    const { accessToken, user } = await login.json();

    const rolesRes = await request.get(`${API}/roles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const roles = await rolesRes.json();
    const lista = Array.isArray(roles) ? roles : (roles.data ?? []);
    expect(lista.length, 'debe haber roles').toBeGreaterThan(0);

    const email = `e2e.cajera.${Date.now()}@coffeeos.test`;

    const alta = await request.post(`${API}/hr/employees`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        organization_id: user.organizationId,
        first_name: 'E2E',
        last_name: 'Cajera',
        email,
        phone: '5550001111',
        location_id: user.locationId,
        role_id: lista[0].id,
        role: 'CASHIER',
        employment_type: 'FULL_TIME',
        hire_date: '2026-09-01',
      },
    });
    expect(alta.ok(), 'el alta del empleado debe funcionar').toBeTruthy();
    const creado = await alta.json();

    // La contrasena temporal viaja una vez, en la respuesta del alta.
    const temporal: string = creado.temporary_password;
    expect(temporal, 'el alta entrega una contrasena temporal').toBeTruthy();
    // Se dicta en voz alta: sin caracteres que se confundan al leerlos.
    expect(temporal).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/,
    );

    // Y sirve: el empleado entra por el formulario, como lo haria de verdad.
    await page.context().clearCookies();
    await page.goto('/login');

    // Esperar a que React hidrate ANTES de escribir. El formulario trae
    // rellenadas las credenciales de demo en desarrollo, y si se teclea antes de
    // tiempo, al hidratar React repinta los campos con SUS valores y deja una
    // mezcla: el correo de uno con la contrasena del otro. Eso salia como
    // "Invalid credentials" y parecia un fallo del alta.
    //
    // El boton habilitado es la senal de que ya hidrato.
    const entrar = page.getByRole('button', { name: /Iniciar Sesión/i });
    await expect(entrar).toBeEnabled({ timeout: 20_000 });

    await page.getByLabel(/Correo/i).fill(email);
    await page.getByLabel(/Contraseña/i).fill(temporal);
    await entrar.click();

    // Lo primero que ve es la pantalla para cambiarla: la que le dictaron la
    // conocen dos personas, asi que la sesion no sirve para nada mas hasta que
    // elija la suya.
    //
    // Se espera al URL, no al aviso de bienvenida: el redirect es una recarga
    // dura y se lleva por delante el toast. Y hay que esperar a que asiente
    // antes de escribir, o la recarga vacia el formulario a medio rellenar.
    await expect(
      page,
      'la sesion recien abierta manda a cambiar la contrasena',
    ).toHaveURL(/\/cambiar-contrasena/, { timeout: 30_000 });

    const propia = 'MiaPropia2026!';
    const campoActual = page.getByLabel(/que te dieron/i);
    await expect(campoActual).toBeVisible({ timeout: 20_000 });

    // El boton se habilita cuando React hidrata. Antes de eso, pulsarlo hacia
    // el envio nativo del formulario: recarga y campos en blanco.
    const guardar = page.getByRole('button', { name: /Guardar y entrar/i });
    await expect(guardar).toBeEnabled({ timeout: 20_000 });

    await campoActual.fill(temporal);
    await page.getByLabel(/Tu contrase.a nueva/i).fill(propia);
    await page.getByLabel(/Rep.tela/i).fill(propia);
    await guardar.click();

    // Con la suya, ya puede trabajar.
    await expect(page).toHaveURL(/\/pos/, { timeout: 20_000 });
    await expect(
      page.getByPlaceholder(/Buscar productos/i),
      'el POS carga con la contrasena propia',
    ).toBeVisible({ timeout: 20_000 });

    // Y entra con sucursal: si no, el POS no tiene donde vender.
    const suyo = await request.post(`${API}/auth/login`, {
      data: { email, password: propia },
    });
    const sesion = await suyo.json();
    expect(sesion.user.locationId, 'la sesion trae sucursal').toBeTruthy();
    expect(sesion.user.organizationId).toBe(user.organizationId);

    // Limpieza: el empleado de prueba no se queda en la base.
    await request.delete(`${API}/hr/employees/${creado.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });
});
