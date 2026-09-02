import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { MailrelayService } from '../mailrelay/mailrelay.service';

/**
 * Mailrelay: modulo aplazado de forma indefinida (2 de septiembre de 2026).
 *
 * Estas pruebas decian "should send a basic email" y pasaban en verde,
 * comprobando que un simulador inventaba un `messageId` y devolvia exito sin
 * que saliera un correo. Peor aun: "should remove subscriber from list" daba
 * por buena una baja que no ocurria, o sea que el cliente seguiria recibiendo
 * correo que pidio no recibir.
 *
 * Ahora comprueban lo unico cierto: que el servicio se construye sin
 * credenciales y que ningun camino afirma haber enviado ni haber dado de baja.
 */
describe('MailrelayService — aplazado, no simulado', () => {
  let service: MailrelayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailrelayService],
    }).compile();

    service = module.get<MailrelayService>(MailrelayService);
  });

  it('se construye sin credenciales', () => {
    // El constructor exigia las cuatro claves con `requireEnv`, asi que la
    // aplicacion ENTERA no arrancaba sin ellas — y despues no se usaban.
    delete process.env.MAILRELAY_API_KEY;
    delete process.env.MAILRELAY_API_URL;
    delete process.env.MAILRELAY_FROM_EMAIL;
    delete process.env.MAILRELAY_FROM_NAME;

    expect(() => new MailrelayService()).not.toThrow();
  });

  it('conserva las plantillas, que si son contenido real', async () => {
    // El texto en español de bienvenida, cumpleanos y lealtad no es un
    // simulador: es lo que se mandara el dia que haya cliente de verdad.
    const plantillas = await service.getTemplates();

    expect(plantillas.length).toBeGreaterThan(0);
  });

  const acciones: Array<[string, () => Promise<unknown>]> = [
    [
      'correo suelto',
      () =>
        service.sendEmail({
          to: 'ana@test.mx',
          subject: 'x',
          htmlContent: 'y',
        }),
    ],
    [
      'correo de bienvenida',
      () => service.sendWelcomeEmail('ana@test.mx', 'Ana', 'Cafeteria Demo'),
    ],
    [
      'correo de cumpleaños',
      () => service.sendBirthdayEmail('ana@test.mx', 'Ana', 'Cafeteria Demo'),
    ],
    ['consulta de estado', () => service.getEmailStatus('EM123')],
    ['alta de suscriptor', () => service.addSubscriber('ana@test.mx', 'Ana')],
    ['baja de suscriptor', () => service.removeSubscriber('ana@test.mx')],
  ];

  it.each(acciones)('%s no finge haber funcionado', async (_n, accion) => {
    await expect(accion()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('el error dice que no salio ningun correo', async () => {
    await expect(
      service.sendEmail({ to: 'ana@test.mx', subject: 'x', htmlContent: 'y' }),
    ).rejects.toThrow(/No se envió ningún correo/);
  });
});
