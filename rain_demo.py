import os
import base64
import secrets
import json
import requests

from dotenv import load_dotenv
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


# ============================================================
# Configuration
# ============================================================

load_dotenv()

BASE_URL = "https://api-dev.raincards.xyz/v1"

RAIN_API_KEY = os.getenv("RAIN_API_KEY")
RAIN_USER_ID = os.getenv("RAIN_USER_ID")
RAIN_CONTRACT_ID = os.getenv("RAIN_CONTRACT_ID")


if not RAIN_API_KEY:
    raise RuntimeError("Missing RAIN_API_KEY in .env")

if not RAIN_USER_ID:
    raise RuntimeError("Missing RAIN_USER_ID in .env")

if not RAIN_CONTRACT_ID:
    raise RuntimeError("Missing RAIN_CONTRACT_ID in .env")


# ============================================================
# Rain Sandbox RSA Public Key
# ============================================================
#
# This is the SessionId public key used by Rain's sandbox.
#
# IMPORTANT:
# Do not generate your own RSA key.
#
# ============================================================

RAIN_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAP192809jZyaw62g/eTzJ3P9H
+RmT88sXUYjQ0K8Bx+rJ83f22+9isKx+lo5UuV8tvOlKwvdDS/pVbzpG7D7NO45c
0zkLOXwDHZkou8fuj8xhDO5Tq3GzcrabNLRLVz3dkx0znfzGOhnY4lkOMIdKxlQb
LuVM/dGDC9UpulF+UwIDAQAB
-----END PUBLIC KEY-----"""


# ============================================================
# Session ID generation
# ============================================================

def generate_session_id():
    """
    Generate a Rain session ID.

    Returns:
        session_id:
            Encrypted session value sent as the `sessionid`
            HTTP header.

        secret_key:
            Original 32-character hexadecimal secret.

    The secret_key is kept in memory only.
    """

    # 16 random bytes = 32 hexadecimal characters.
    secret_key = secrets.token_hex(16)

    if len(secret_key) != 32:
        raise RuntimeError(
            f"Invalid secret key length: {len(secret_key)}"
        )

    # Rain's Node implementation effectively does:
    #
    # Buffer.from(secretKey, "hex").toString("base64")
    #
    secret_key_base64 = base64.b64encode(
        bytes.fromhex(secret_key)
    )

    public_key = serialization.load_pem_public_key(
        RAIN_PUBLIC_KEY.encode("utf-8")
    )

    # Rain uses RSA-OAEP with SHA-1.
    encrypted = public_key.encrypt(
        secret_key_base64,
        padding.OAEP(
            mgf=padding.MGF1(
                algorithm=hashes.SHA1()
            ),
            algorithm=hashes.SHA1(),
            label=None,
        ),
    )

    session_id = base64.b64encode(
        encrypted
    ).decode("utf-8")

    return session_id, secret_key


# ============================================================
# HTTP helper
# ============================================================

def api_request(
    method,
    path,
    *,
    session_id=None,
    json_body=None,
):
    """
    Make an HTTP request to Rain's sandbox API.
    """

    headers = {
        "Api-Key": RAIN_API_KEY,
        "Content-Type": "application/json",
    }

    if session_id:
        headers["sessionid"] = session_id

    url = f"{BASE_URL}{path}"

    print(f"\n{method} {url}")

    if json_body is not None:
        print(
            "Request body:",
            json.dumps(json_body, indent=2)
        )

    response = requests.request(
        method,
        url,
        headers=headers,
        json=json_body,
        timeout=30,
    )

    print(f"HTTP {response.status_code}")

    try:
        data = response.json()
    except ValueError:
        data = response.text

    if not response.ok:
        print("\nRain API error:")

        print(
            json.dumps(data, indent=2)
            if isinstance(data, dict)
            else data
        )

        response.raise_for_status()

    return data


# ============================================================
# STEP 1: Fund collateral
# ============================================================

def fund_collateral():
    print("\n" + "=" * 60)
    print("STEP 1: FUND COLLATERAL")
    print("=" * 60)

    payload = {
        "contractId": RAIN_CONTRACT_ID,
        "currency": "rusd",

        # $1,000.00
        # Amount is in USD cents.
        "amount": 100000,
    }

    result = api_request(
        "POST",
        "/simulate/collateral/fund",
        json_body=payload,
    )

    print(
        json.dumps(result, indent=2)
    )

    return result


# ============================================================
# STEP 2: Generate session
# ============================================================

def create_session():
    print("\n" + "=" * 60)
    print("GENERATING SESSION ID")
    print("=" * 60)

    session_id, secret_key = generate_session_id()

    print(
        "Session ID generated successfully."
    )

    print(
        f"Secret key length: {len(secret_key)} characters"
    )

    # Do not print either value.
    #
    # secret_key would be required later if you implement
    # decryption of encryptedPan / encryptedCvc.
    #
    return session_id, secret_key


# ============================================================
# STEP 3: Create scoped card
# ============================================================

def create_scoped_card(
    session_id,
    amount_in_usd_cents,
):
    print("\n" + "=" * 60)
    print("CREATING SCOPED CARD")
    print("=" * 60)

    payload = {
        "amountInUSDCents": amount_in_usd_cents,
    }

    result = api_request(
        "POST",
        f"/issuing/users/{RAIN_USER_ID}/cards/scoped",
        session_id=session_id,
        json_body=payload,
    )

    # Never print encrypted PAN/CVC.
    safe_result = {
        key: value
        for key, value in result.items()
        if key not in (
            "encryptedPan",
            "encryptedCvc",
        )
    }

    print(
        json.dumps(safe_result, indent=2)
    )

    card_id = result.get("id")

    if not card_id:
        raise RuntimeError(
            "Rain did not return a card ID."
        )

    print(
        f"\nCard ID: {card_id}"
    )

    print(
        f"Last 4: {result.get('last4')}"
    )

    print(
        f"Status: {result.get('status')}"
    )

    return result


# ============================================================
# STEP 4: Authorize + settle one transaction
# ============================================================

def create_transaction(
    card_id,
    amount,
    merchant_name,
    mcc,
):
    print("\n" + "=" * 60)
    print(
        f"AUTHORIZING ${amount / 100:.2f} "
        f"- {merchant_name}"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Authorization
    # --------------------------------------------------------

    authorization_payload = {
        "cardId": card_id,
        "amount": amount,
        "currency": "USD",
        "merchantName": merchant_name,
        "merchantCategoryCode": mcc,
    }

    result = api_request(
        "POST",
        "/simulate/transactions/authorize",
        json_body=authorization_payload,
    )

    print(
        json.dumps(result, indent=2)
    )

    transaction_id = result.get(
        "transactionId"
    )

    if not transaction_id:
        raise RuntimeError(
            f"No transactionId returned: {result}"
        )

    if result.get("status") != "authorized":
        raise RuntimeError(
            f"Transaction was not authorized: {result}"
        )

    print(
        f"Transaction ID: {transaction_id}"
    )

    # --------------------------------------------------------
    # Settlement
    # --------------------------------------------------------
    #
    # The documented Quickstart example uses {}.
    #
    # However, the sandbox endpoint you are actually using
    # returned:
    #
    #   body must have required property 'amount'
    #
    # Therefore we explicitly send amount here.
    #
    # --------------------------------------------------------

    print("\nSettling transaction...")

    settlement_payload = {
        "amount": amount,
    }

    settled = api_request(
        "POST",
        f"/simulate/transactions/{transaction_id}/settle",
        json_body=settlement_payload,
    )

    print(
        json.dumps(settled, indent=2)
    )

    if settled.get("status") != "settled":
        raise RuntimeError(
            f"Transaction did not settle: {settled}"
        )

    print(
        f"Transaction settled: {transaction_id}"
    )

    return transaction_id, settled


# ============================================================
# STEP 5: Create multiple card transactions
# ============================================================

def create_multiple_transactions():
    """
    Create multiple independent sandbox transactions.

    IMPORTANT:
    Each transaction receives its own scoped card.

    Your sandbox demonstrated that after:

        authorize -> settle

    the scoped card is no longer active.

    Therefore a settled scoped card must not be reused.

    Transactions:

        $25.00
        $18.50
        $42.00
        -------
        $85.50
    """

    transactions = [
        {
            "amount": 2500,
            "merchant_name": "Coffee Shop",
            "mcc": "5814",
        },
        {
            "amount": 1850,
            "merchant_name": "Grocery Store",
            "mcc": "5411",
        },
        {
            "amount": 4200,
            "merchant_name": "Travel Store",
            "mcc": "4722",
        },
    ]

    results = []

    for index, tx in enumerate(
        transactions,
        start=1,
    ):
        print("\n" + "=" * 60)
        print(
            f"CARD TRANSACTION "
            f"{index}/{len(transactions)}"
        )
        print("=" * 60)

        # ----------------------------------------------------
        # New session
        # ----------------------------------------------------

        session_id, secret_key = create_session()

        # ----------------------------------------------------
        # New scoped card
        #
        # Give the card enough capacity for this transaction.
        # ----------------------------------------------------

        card = create_scoped_card(
            session_id=session_id,
            amount_in_usd_cents=tx["amount"],
        )

        card_id = card["id"]

        # ----------------------------------------------------
        # Authorize and settle
        # ----------------------------------------------------

        transaction_id, settlement = (
            create_transaction(
                card_id=card_id,
                amount=tx["amount"],
                merchant_name=tx["merchant_name"],
                mcc=tx["mcc"],
            )
        )

        results.append(
            {
                "cardId": card_id,
                "transactionId": transaction_id,
                "amount": tx["amount"],
                "merchant": tx["merchant_name"],
                "settlement": settlement,
            }
        )

        # Explicitly remove references to sensitive session
        # material after the card operation.
        session_id = None
        secret_key = None

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("CARD TRANSACTIONS COMPLETE")
    print("=" * 60)

    total = sum(
        tx["amount"]
        for tx in results
    )

    for tx in results:
        print(
            f"{tx['transactionId']} | "
            f"${tx['amount'] / 100:.2f} | "
            f"{tx['merchant']} | "
            f"card {tx['cardId']}"
        )

    print("-" * 60)

    print(
        f"TOTAL CARD SPEND: "
        f"${total / 100:.2f}"
    )

    return results


# ============================================================
# STEP 6: Read transaction history
# ============================================================

def list_transactions():
    print("\n" + "=" * 60)
    print("TRANSACTION HISTORY")
    print("=" * 60)

    result = api_request(
        "GET",
        "/issuing/transactions?limit=20",
    )

    print(
        json.dumps(result, indent=2)
    )

    return result


# ============================================================
# STEP 7: Create ACH -> USDC/Base payment route
# ============================================================

def create_onramp():
    """
    Return the existing ACH -> USDC/Base payment route.

    Rain's sandbox does not allow creating another route with
    the same source and destination.
    """

    # This route was already successfully created in the
    # Rain sandbox.
    payment_route_id = os.getenv(
        "RAIN_ONRAMP_ROUTE_ID",
        "f9ddcfc8-4254-49f8-b973-9f1cbcd3ffc7",
    )

    print("\n" + "=" * 60)
    print("USING EXISTING ACH -> USDC / BASE ONRAMP")
    print("=" * 60)

    print(
        f"Payment Route ID: {payment_route_id}"
    )

    return {
        "id": payment_route_id,
        "existing": True,
    }

# ============================================================
# STEP 8: Simulate payment-route transfers
# ============================================================

def simulate_payment_route(
    payment_route_id,
    amounts,
):
    """
    Simulate multiple transfers through a payment route.

    Sandbox limitation observed from the API:

        Maximum amount per simulation = $100.00 USD

    Therefore every individual amount must be <= 100.
    """

    print("\n" + "=" * 60)
    print("SIMULATING PAYMENT-ROUTE TRANSFERS")
    print("=" * 60)

    MAX_AMOUNT = 100.00

    results = []

    for amount in amounts:

        amount_float = float(amount)

        if amount_float <= 0:
            raise ValueError(
                f"Payment-route amount must be positive: "
                f"{amount}"
            )

        if amount_float > MAX_AMOUNT:
            raise ValueError(
                "Payment-route simulation cannot exceed "
                f"$100.00 per transfer. "
                f"Received ${amount_float:.2f}"
            )

        print(
            f"\nSimulating ${amount_float:.2f}..."
        )

        payload = {
            "paymentRouteId": payment_route_id,
            "amount": str(amount),
        }

        result = api_request(
            "POST",
            "/simulate/payment-routes",
            json_body=payload,
        )

        print(
            json.dumps(result, indent=2)
        )

        results.append(
            {
                "amount": amount_float,
                "result": result,
            }
        )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    total = sum(
        item["amount"]
        for item in results
    )

    print("\n" + "=" * 60)
    print("PAYMENT-ROUTE SIMULATIONS COMPLETE")
    print("=" * 60)

    print(
        f"Transfers: {len(results)}"
    )

    print(
        f"Total simulated: ${total:.2f}"
    )

    return results


# ============================================================
# STEP 9: Read transfer transactions
# ============================================================

def list_transfer_transactions():
    print("\n" + "=" * 60)
    print("TRANSFER TRANSACTIONS")
    print("=" * 60)

    result = api_request(
        "GET",
        "/issuing/transactions?type=transfer&limit=20",
    )

    print(
        json.dumps(result, indent=2)
    )

    return result


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("RAIN SANDBOX")
    print("CARD TRANSACTIONS + MONEY ACROSS RAILS")
    print("=" * 60)

    # ========================================================
    # 1. Fund collateral
    # ========================================================

    fund_collateral()

    # ========================================================
    # 2. Create multiple independent card transactions
    #
    # Every transaction gets:
    #
    #   new session
    #       ↓
    #   new scoped card
    #       ↓
    #   authorization
    #       ↓
    #   settlement
    #
    # ========================================================

    card_transactions = (
        create_multiple_transactions()
    )

    # ========================================================
    # 3. Read card transaction history
    # ========================================================

    list_transactions()

    # ========================================================
    # 4. Create ACH -> USDC/Base onramp
    # ========================================================

    onramp = create_onramp()

    onramp_route_id = onramp["id"]

    print(
        "\nOnramp route created:"
    )

    print(
        f"  {onramp_route_id}"
    )

    # ========================================================
    # 5. Simulate ACH -> USDC transfers
    #
    # IMPORTANT:
    # The sandbox limits each individual simulation to $100.
    #
    # Five $100 simulations = $500 total.
    # ========================================================

    onramp_transfers = (
        simulate_payment_route(
            payment_route_id=onramp_route_id,

            amounts=[
                "100",
                "100",
                "100",
                "100",
                "100",
            ],
        )
    )

    # ========================================================
    # 6. Read transfer transactions
    # ========================================================

    list_transfer_transactions()

    # ========================================================
    # Final summary
    # ========================================================

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)

    print("\nCARD TRANSACTIONS:")

    for tx in card_transactions:
        print(
            f"  ${tx['amount'] / 100:.2f} "
            f"| {tx['merchant']} "
            f"| {tx['transactionId']}"
        )

    card_total = sum(
        tx["amount"]
        for tx in card_transactions
    ) / 100

    print(
        f"\nTotal card spend: "
        f"${card_total:.2f}"
    )

    print(
        f"\nOnramp route: "
        f"{onramp_route_id}"
    )

    print(
        f"Onramp simulations: "
        f"{len(onramp_transfers)}"
    )

    onramp_total = sum(
        tx["amount"]
        for tx in onramp_transfers
    )

    print(
        f"Total onramp simulated: "
        f"${onramp_total:.2f}"
    )

    print(
        "\nAll activity was performed "
        "in Rain's sandbox."
    )


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    main()