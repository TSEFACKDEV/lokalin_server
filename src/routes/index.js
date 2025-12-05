import express from 'express';
import categoryRouter from "./Category.route.js";
import genuka from "./Genuka.route.js";
import webhookRouter from "./Webhook.route.js";
import pmeRouter from "./PME.route.js";
import equipementRouter from "./Equipement.route.js";
import reservationRouter from "./Reservation.route.js";
import avisRouter from "./Avis.route.js";
import contactRouter from "./Contact.route.js";
import debugRouter from "./Debug.route.js";

const router = express.Router();

router.use("/category", categoryRouter);
router.use("/auth/genuka", genuka);
router.use("/webhooks", webhookRouter);
router.use("/pmes", pmeRouter);
router.use("/equipements", equipementRouter);
router.use("/reservations", reservationRouter);
router.use("/avis", avisRouter);
router.use("/contact", contactRouter);

// Routes de debug (développement uniquement)
if (process.env.NODE_ENV === 'development') {
  router.use("/debug", debugRouter);
}

export default router;
