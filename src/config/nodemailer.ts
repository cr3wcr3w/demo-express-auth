import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
	host: "gmail",
	port: 587,
	secure: false,
	auth: {
		user: "",
		pass: "",
	},
});
