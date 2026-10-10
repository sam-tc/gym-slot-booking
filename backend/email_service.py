import os

from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from security import create_email_verification_token


BREVO_API_KEY = os.getenv("BREVO_API_KEY")

BREVO_SENDER_EMAIL = os.getenv(
    "BREVO_SENDER_EMAIL"
)

BREVO_SENDER_NAME = os.getenv(
    "BREVO_SENDER_NAME",
    "GymSlot",
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")


if not BREVO_API_KEY:
    raise RuntimeError(
        "BREVO_API_KEY is not set"
    )

if not BREVO_SENDER_EMAIL:
    raise RuntimeError(
        "BREVO_SENDER_EMAIL is not set"
    )


client = Brevo(
    api_key=BREVO_API_KEY
)


def send_verification_email(
    user_id: int,
    email: str,
    name: str,
):
    token = create_email_verification_token(
        user_id
    )

    verification_url = (
        f"{FRONTEND_URL}"
        f"/verify-email"
        f"?token={token}"
    )

    client.transactional_emails.send_transac_email(
        subject="Verify your GymSlot email",

        html_content=f"""
        <div
            style="
                font-family: Arial, sans-serif;
                max-width: 560px;
                margin: 0 auto;
                padding: 24px;
            "
        >
            <h2>
                Verify your GymSlot account
            </h2>

            <p>
                Hi {name},
            </p>

            <p>
                Click the button below to
                verify your email address.
            </p>

            <p>
                <a
                    href="{verification_url}"
                    style="
                        display: inline-block;
                        padding: 12px 18px;
                        background: #b7ff3c;
                        color: #111;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 700;
                    "
                >
                    Verify email
                </a>
            </p>

            <p>
                This link expires in 30 minutes.
            </p>

            <p>
                If you did not create this
                account, you can ignore this email.
            </p>
        </div>
        """,

        sender=SendTransacEmailRequestSender(
            name=BREVO_SENDER_NAME,
            email=BREVO_SENDER_EMAIL,
        ),

        to=[
            SendTransacEmailRequestToItem(
                email=email,
                name=name,
            )
        ],
    )