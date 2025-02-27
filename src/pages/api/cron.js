export default function handler(req, res) {
  if (req.method === "GET") {
    console.log("Scheduled job executed at", new Date());

    // Your logic here (e.g., send emails, clean database, etc.)
    res.status(200).json({ message: "Cron job executed successfully" });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
