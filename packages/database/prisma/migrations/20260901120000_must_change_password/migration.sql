-- La contraseña de un empleado recién dado de alta la conoce el dueño, que se
-- la dicta. Hasta que el empleado la cambie, la sesión sólo sirve para eso.
--
-- Los usuarios que ya existen NO se marcan: llevan tiempo usando su contraseña
-- y bloquearlos a todos de golpe dejaría la cafetería sin poder vender.
ALTER TABLE "users"
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
