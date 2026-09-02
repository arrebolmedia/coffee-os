import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { TwilioService } from '../twilio/twilio.service';

/**
 * Twilio: modulo aplazado de forma indefinida (2 de septiembre de 2026).
 *
 * Estas pruebas afirmaban lo contrario. Decian "should send a WhatsApp
 * message" y pasaban en verde — comprobando que un simulador devolvia un SID
 * inventado y `status: 'sent'` sin que saliera nada. Un test que verifica una
 * mentira la protege: mientras estuvieran ahi, nadie iba a mirar dos veces.
 *
 * Ahora comprueban lo unico cierto: que ningun camino puede afirmar que un
 * mensaje se envio.
 */
describe('TwilioService — aplazado, no simulado', () => {
  let service: TwilioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwilioService],
    }).compile();

    service = module.get<TwilioService>(TwilioService);
  });

  it('se construye sin credenciales', () => {
    // El constructor exigia TWILIO_ACCOUNT_SID y tres mas con `requireEnv`, asi
    // que la aplicacion ENTERA se negaba a arrancar sin unas claves que despues
    // no usaba para nada. Un punto de venta no puede depender de eso.
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_SMS_FROM;
    delete process.env.TWILIO_WHATSAPP_FROM;

    expect(() => new TwilioService()).not.toThrow();
  });

  const envios: Array<[string, () => Promise<unknown>]> = [
    ['WhatsApp', () => service.sendWhatsApp({ to: '+521', message: 'hola' })],
    ['SMS', () => service.sendSMS({ to: '+521', message: 'hola' })],
    [
      'felicitacion de cumpleaños',
      () => service.sendBirthdayGreeting('+521', 'Ana'),
    ],
    [
      'premio de lealtad',
      () => service.sendLoyaltyReward('+521', 'Ana', '9+1'),
    ],
    [
      'aviso de orden lista',
      () => service.sendOrderReady('+521', 'Ana', 'ORD-1'),
    ],
    ['campaña', () => service.sendCampaign('+521', 'Ana', 'promo')],
    ['consulta de estado', () => service.getMessageStatus('SM123')],
    [
      'webhook entrante',
      () => service.handleIncomingMessage({ From: '+521', Body: 'hola' }),
    ],
  ];

  it.each(envios)('%s no finge haberse enviado', async (_nombre, accion) => {
    await expect(accion()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('el error dice que no se envió nada, no un fallo generico', async () => {
    // Quien lo lea tiene que entender que el cliente NO recibio el mensaje.
    await expect(
      service.sendWhatsApp({ to: '+521', message: 'hola' }),
    ).rejects.toThrow(/No se envió ningún mensaje/);
  });
});
