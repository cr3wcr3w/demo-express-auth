import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  host: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: "racelisjk@gmail.com",
    pass: "zlim qcna mbdx zrvt",
  },
});