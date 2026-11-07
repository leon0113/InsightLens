"""Generate the three synthetic demo CSVs. All people, orders and readings are invented.

Run from the repository root with the engine's Python:
    analysis-engine\\.venv\\Scripts\\python.exe sample-data\\generate_samples.py

The seed is fixed, so the output is the same every time.
"""

import csv
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np

SEED = 2026
OUTPUT_DIR = Path(__file__).parent


def maybe_blank(rng: np.random.Generator, value: object, chance: float) -> object:
    """Return an empty cell some of the time."""
    return "" if rng.random() < chance else value


def write_rows(
    name: str,
    header: list[str],
    rows: list[list[object]],
    delimiter: str = ",",
    encoding: str = "utf-8",
) -> None:
    with open(OUTPUT_DIR / name, "w", newline="", encoding=encoding) as file:
        writer = csv.writer(file, delimiter=delimiter)
        writer.writerow(header)
        writer.writerows(rows)


def ecommerce_orders(rng: np.random.Generator, count: int = 5000) -> None:
    """Online store orders. Dates mix ISO and US formats, and some prices are not numbers."""
    regions = ["North", "South", "East", "West", "Central"]
    categories = ["Electronics", "Home", "Garden", "Sports", "Toys", "Books", "Beauty"]
    base_prices = dict(zip(categories, [180, 60, 45, 70, 30, 18, 25]))
    payments = ["Card", "PayPal", "Bank transfer", "Gift card"]
    # Notes are assembled from fragments so most are unique, like real free text.
    note_parts = [
        ["Please", "Kindly", "If possible,", "Customer asks to", "Driver should", "Remember to",
         "Courier must", "We need to"],
        ["leave the parcel", "deliver the box", "drop the order", "hand the package",
         "place the delivery", "bring the items", "keep the parcel", "send the order"],
        ["with a neighbour", "at the back door", "in the garage", "at reception",
         "behind the gate", "on the porch", "at the side entrance", "in the mailroom"],
        ["after 5pm.", "before noon.", "on weekdays only.", "and ring twice.",
         "and send a photo.", "without knocking.", "this Friday.", "as a gift."],
    ]
    start = datetime(2024, 1, 1)
    rows = []

    for index in range(count):
        day = start + timedelta(days=int(rng.integers(0, 730)))
        date_text = (
            day.strftime("%m/%d/%Y") if rng.random() < 0.18 else day.strftime("%Y-%m-%d")
        )
        category = str(rng.choice(categories, p=[0.2, 0.2, 0.1, 0.15, 0.1, 0.15, 0.1]))
        quantity = int(rng.poisson(1.2)) + 1
        price = round(float(rng.lognormal(np.log(base_prices[category]), 0.45)), 2)
        if rng.random() < 0.004:
            price = round(price * 40, 2)
        discount = int(rng.choice([0, 5, 10, 15, 20]))
        total = round(quantity * price * (1 - discount / 100), 2)
        price_text = "call for price" if rng.random() < 0.012 else price

        rows.append(
            [
                f"ORD-{100000 + index}",
                f"CUST-{int(rng.integers(1000, 3200))}",
                date_text,
                str(rng.choice(regions, p=[0.3, 0.25, 0.2, 0.15, 0.1])),
                category,
                maybe_blank(rng, quantity, 0.03),
                price_text,
                maybe_blank(rng, discount, 0.27),
                maybe_blank(rng, total, 0.02),
                str(rng.choice(payments, p=[0.6, 0.25, 0.1, 0.05])),
                str(rng.choice(["yes", "no"], p=[0.12, 0.88])),
                maybe_blank(rng, " ".join(str(rng.choice(part)) for part in note_parts), 0.86),
            ]
        )

    # A failed checkout retry: real orders that were written twice.
    rows += [list(rows[int(i)]) for i in rng.integers(0, count, size=60)]
    write_rows(
        "ecommerce_orders.csv",
        [
            "order_id",
            "customer_ref",
            "order_date",
            "region",
            "category",
            "quantity",
            "unit_price",
            "discount_pct",
            "order_total",
            "payment_method",
            "is_gift",
            "delivery_note",
        ],
        rows,
    )


def clinic_appointments(rng: np.random.Generator, count: int = 3000) -> None:
    """Outpatient visits. Dates are in one non-ISO format, and ages include placeholders."""
    departments = ["Cardiology", "Dermatology", "General practice", "Orthopedics", "Pediatrics"]
    insurers = ["Public", "Private", "Employer", "Self-pay"]
    reasons = [
        "Follow-up after recent blood test results",
        "Routine annual check-up with the family doctor",
        "Persistent lower back pain for several weeks",
        "Skin rash that has not improved with treatment",
        "Review of current blood pressure medication",
    ]
    start = datetime(2025, 1, 6)
    rows = []

    for index in range(count):
        appointment = start + timedelta(days=int(rng.integers(0, 365)))
        age = int(np.clip(rng.normal(47, 19), 1, 96))
        age_text: object = age
        roll = rng.random()
        if roll < 0.015:
            age_text = "unknown"
        elif roll < 0.022:
            age_text = 999

        systolic = float(rng.normal(102 + 0.42 * age, 9))
        diastolic = float(0.55 * systolic + rng.normal(10, 4))
        wait = float(rng.lognormal(2.9, 0.75))
        if rng.random() < 0.01:
            wait += float(rng.uniform(180, 420))

        rows.append(
            [
                index + 1,
                f"PT-{int(rng.integers(10000, 12500))}",
                appointment.strftime("%d %b %Y"),
                str(rng.choice(departments, p=[0.15, 0.15, 0.4, 0.15, 0.15])),
                age_text,
                maybe_blank(rng, round(float(rng.normal(26.5, 4.8)), 1), 0.24),
                maybe_blank(rng, round(systolic), 0.06),
                maybe_blank(rng, round(diastolic), 0.06),
                round(wait, 1),
                int(rng.choice([0, 1], p=[0.86, 0.14])),
                maybe_blank(rng, str(rng.choice(insurers)), 0.09),
                "Riverside Clinic",
                maybe_blank(rng, str(rng.choice(reasons)), 0.55),
            ]
        )

    write_rows(
        "clinic_appointments.csv",
        [
            "appointment_no",
            "patient_ref",
            "appointment_date",
            "department",
            "age",
            "bmi",
            "systolic_bp",
            "diastolic_bp",
            "wait_minutes",
            "no_show",
            "insurance_type",
            "site",
            "visit_reason",
        ],
        rows,
    )


def sensor_readings(rng: np.random.Generator, count: int = 8000) -> None:
    """Factory sensors. Semicolon-delimited cp1252 file with error codes and malformed lines."""
    sensors = [f"S-{number:02d}" for number in range(1, 13)]
    lines = ["Line A", "Line B", "Line C"]
    operators = [
        "Bearing replaced during the planned stop",
        "Calibration checked against the reference gauge",
        "Coolant topped up at the start of the shift",
    ]
    start = datetime(2026, 3, 1)
    rows = []

    for index in range(count):
        moment = start + timedelta(minutes=5 * index)
        load = 0.6 + 0.3 * np.sin(index / 288 * 2 * np.pi) + float(rng.normal(0, 0.05))
        temperature = 42 + 28 * load + float(rng.normal(0, 1.5))
        if rng.random() < 0.006:
            temperature += float(rng.uniform(35, 60))
        status = str(rng.choice(["OK", "WARN", "FAULT"], p=[0.94, 0.05, 0.01]))
        temperature_text: object = round(temperature, 2)
        if status == "FAULT" and rng.random() < 0.5:
            temperature_text = "ERR"

        rows.append(
            [
                moment.strftime("%Y-%m-%dT%H:%M:%S"),
                str(rng.choice(sensors)),
                str(rng.choice(lines)),
                maybe_blank(rng, temperature_text, 0.015),
                maybe_blank(rng, round(float(rng.gamma(2.2, 0.9)), 3), 0.03),
                round(180 + 95 * load + float(rng.normal(0, 4)), 1),
                maybe_blank(rng, round(float(rng.normal(46, 7)), 1), 0.35),
                round(11 + 16 * load + float(rng.normal(0, 0.8)), 2),
                status,
                str(rng.choice(["true", "false"], p=[0.03, 0.97])),
                maybe_blank(rng, str(rng.choice(operators)), 0.93),
            ]
        )

    # Lines broken by an extra field, as a faulty logger would write them.
    for position in rng.integers(0, count, size=12):
        rows[int(position)] = rows[int(position)] + ["partial write"]

    write_rows(
        "sensor_readings.csv",
        [
            "timestamp",
            "sensor_code",
            "production_line",
            "temperature_°c",
            "vibration_mm_s",
            "pressure_kpa",
            "humidity_pct",
            "power_kw",
            "status",
            "maintenance_due",
            "operator_note",
        ],
        rows,
        delimiter=";",
        encoding="cp1252",
    )


def main() -> None:
    rng = np.random.default_rng(SEED)
    ecommerce_orders(rng)
    clinic_appointments(rng)
    sensor_readings(rng)


if __name__ == "__main__":
    main()
