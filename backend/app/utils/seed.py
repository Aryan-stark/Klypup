"""
utils/seed.py — Populate MongoDB with realistic demo data.

Run once after `docker compose up`:
    docker compose exec backend python -m app.utils.seed

Creates:
  - 1 Organisation ("Acme Retail")
  - 1 Admin  (admin@acme.com / password123)
  - 1 Analyst (analyst@acme.com / password123)
  - 1 OrgConfig (default thresholds)
  - 520 Products across 8 categories
  - 3 CompetitorPrice records per product (last 3 days)
  - 4 DemandSignal records per product (one per signal type)

Total MongoDB writes: ~4,600 documents
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.models.competitor_price import CompetitorPrice
from app.models.demand_signal import DemandSignal, SignalType, TrendDirection
from app.models.org_config import OrgConfig
from app.models.organization import Organization
from app.models.product import Product
from app.models.user import User, UserRole
from app.utils.hashing import hash_password

# ── Helpers ───────────────────────────────────────────────────────────────────

rng = random.Random(42)  # fixed seed → reproducible data

COMPETITORS = ["PriceSpy", "ShopBot", "RivalStore", "MegaMart", "BestBuy"]
BRANDS = [
    "TechCore", "Luminos", "ArcticLine", "StellarTech", "NovaBrand",
    "PeakGear", "ZenCraft", "IronClad", "BlueLine", "SwiftEdge",
    "PureForm", "EcoSmart", "MaxDrive", "CoreLine", "ProSeries",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(n: float) -> datetime:
    return _now() - timedelta(days=n)


# ── Product catalogue templates ───────────────────────────────────────────────

CATALOGUE: list[dict] = [
    # Electronics — 80 products
    *[
        {
            "category": "Electronics",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.55,
        }
        for sub, pr in [
            ("Laptop", (699, 2499)),
            ("Laptop", (499, 999)),
            ("Smartphone", (299, 1299)),
            ("Tablet", (199, 899)),
            ("Smartwatch", (149, 599)),
            ("Headphones", (49, 449)),
            ("Earbuds", (29, 299)),
            ("Monitor", (149, 999)),
            ("Keyboard", (39, 249)),
            ("Mouse", (19, 149)),
        ]
        for _ in range(8)
    ],
    # Home & Garden — 80 products
    *[
        {
            "category": "Home & Garden",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.45,
        }
        for sub, pr in [
            ("Coffee Maker", (29, 299)),
            ("Air Purifier", (49, 399)),
            ("Robot Vacuum", (99, 799)),
            ("Blender", (29, 249)),
            ("Stand Mixer", (79, 499)),
            ("Pressure Cooker", (39, 199)),
            ("Garden Hose", (15, 89)),
            ("Lawn Mower", (99, 599)),
        ]
        for _ in range(10)
    ],
    # Clothing — 70 products
    *[
        {
            "category": "Clothing",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.35,
        }
        for sub, pr in [
            ("Running Shoes", (39, 199)),
            ("Winter Jacket", (49, 349)),
            ("Yoga Pants", (19, 99)),
            ("Dress Shirt", (19, 129)),
            ("Casual T-Shirt", (9, 59)),
            ("Jeans", (29, 149)),
            ("Boots", (49, 299)),
        ]
        for _ in range(10)
    ],
    # Sports — 60 products
    *[
        {
            "category": "Sports",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.48,
        }
        for sub, pr in [
            ("Bicycle", (199, 1999)),
            ("Dumbbells", (19, 199)),
            ("Yoga Mat", (15, 89)),
            ("Treadmill", (299, 1999)),
            ("Tennis Racket", (29, 199)),
            ("Basketball", (15, 99)),
        ]
        for _ in range(10)
    ],
    # Beauty & Health — 60 products
    *[
        {
            "category": "Beauty & Health",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.30,
        }
        for sub, pr in [
            ("Facial Serum", (12, 89)),
            ("Electric Toothbrush", (19, 199)),
            ("Hair Dryer", (19, 249)),
            ("Perfume", (29, 299)),
            ("Sunscreen SPF50", (9, 49)),
            ("Supplement Pack", (19, 99)),
        ]
        for _ in range(10)
    ],
    # Toys — 60 products
    *[
        {
            "category": "Toys",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.40,
        }
        for sub, pr in [
            ("Board Game", (12, 79)),
            ("Building Set", (19, 149)),
            ("RC Car", (19, 199)),
            ("Puzzle", (9, 59)),
            ("Action Figure", (9, 79)),
            ("Plush Toy", (6, 49)),
        ]
        for _ in range(10)
    ],
    # Books & Media — 50 products
    *[
        {
            "category": "Books & Media",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.50,
        }
        for sub, pr in [
            ("Hardcover Book", (9, 49)),
            ("eBook Reader", (79, 299)),
            ("Audiobook Subscription", (9, 29)),
            ("Vinyl Record", (15, 79)),
            ("Board Game Strategy Book", (7, 29)),
        ]
        for _ in range(10)
    ],
    # Automotive — 60 products
    *[
        {
            "category": "Automotive",
            "subcategory": sub,
            "name_template": f"{sub} {{brand}} {{model}}",
            "price_range": pr,
            "cost_ratio": 0.55,
        }
        for sub, pr in [
            ("Car Phone Mount", (9, 59)),
            ("Dash Camera", (29, 299)),
            ("Car Vacuum", (19, 149)),
            ("Jump Starter", (39, 199)),
            ("Car Cover", (29, 149)),
            ("Air Compressor", (29, 199)),
        ]
        for _ in range(10)
    ],
]


def _make_sku(category: str, subcategory: str, index: int) -> str:
    cat = category[:3].upper().replace(" ", "")
    sub = subcategory[:3].upper().replace(" ", "")
    return f"{cat}-{sub}-{index:04d}"


def _make_product(tmpl: dict, org_id, index: int) -> Product:
    brand = rng.choice(BRANDS)
    model_num = rng.randint(100, 9999)
    name = (
        tmpl["name_template"]
        .replace("{brand}", brand)
        .replace("{model}", str(model_num))
    )
    lo, hi = tmpl["price_range"]
    current_price = round(rng.uniform(lo, hi), 2)
    cost_basis = round(current_price * tmpl["cost_ratio"] * rng.uniform(0.9, 1.1), 2)
    min_price = round(cost_basis * 1.05, 2)
    max_price = round(current_price * rng.uniform(1.3, 2.0), 2)
    stock = rng.randint(0, 500)

    return Product(
        org_id=org_id,
        sku=_make_sku(tmpl["category"], tmpl["subcategory"], index),
        name=name,
        category=tmpl["category"],
        subcategory=tmpl["subcategory"],
        brand=brand,
        current_price=current_price,
        cost_basis=cost_basis,
        msrp=round(current_price * rng.uniform(1.1, 1.4), 2),
        min_price=min_price,
        max_price=max_price,
        stock_quantity=stock,
        reorder_point=rng.randint(5, 30),
        tags=[tmpl["subcategory"].lower(), brand.lower()],
        is_active=True,
        created_at=_days_ago(rng.uniform(30, 365)),
    )


def _make_competitor_prices(product: Product, org_id) -> list[CompetitorPrice]:
    records = []
    base = product.current_price
    competitors = rng.sample(COMPETITORS, k=3)
    for i, comp in enumerate(competitors):
        # one record per competitor, staggered over last 3 days
        price = round(base * rng.uniform(0.85, 1.20), 2)
        records.append(
            CompetitorPrice(
                org_id=org_id,
                product_id=product.id,
                competitor_name=comp,
                price=price,
                in_stock=rng.random() > 0.15,  # 85% chance in-stock
                scraped_at=_days_ago(i * 0.9),
            )
        )
    return records


def _make_demand_signals(product: Product, org_id) -> list[DemandSignal]:
    signals = []
    for signal_type in SignalType:
        value = round(rng.uniform(20, 95), 1)
        trend = rng.choice(list(TrendDirection))
        change_7d = round(rng.uniform(-15, 25), 1) if trend != TrendDirection.FLAT else round(rng.uniform(-2, 2), 1)
        change_30d = round(change_7d * rng.uniform(1.5, 3.0), 1)
        signals.append(
            DemandSignal(
                org_id=org_id,
                product_id=product.id,
                signal_type=signal_type,
                signal_value=value,
                trend_direction=trend,
                change_pct_7d=change_7d,
                change_pct_30d=change_30d,
                source="mock",
                recorded_at=_days_ago(rng.uniform(0, 2)),
            )
        )
    return signals


# ── Main seeder ───────────────────────────────────────────────────────────────

async def seed() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            Organization,
            User,
            OrgConfig,
            Product,
            CompetitorPrice,
            DemandSignal,
        ],
    )

    # ── Check idempotency ─────────────────────────────────────────────────────
    existing_org = await Organization.find_one(Organization.slug == "acme-retail")
    if existing_org:
        print("Seed data already exists (org 'acme-retail' found). Skipping.")
        return

    # ── Organisation ──────────────────────────────────────────────────────────
    org = Organization(name="Acme Retail", slug="acme-retail")
    await org.insert()
    print(f"Created org: {org.name} ({org.id})")

    # ── Users ─────────────────────────────────────────────────────────────────
    admin = User(
        org_id=org.id,
        email="admin@acme.com",
        password_hash=hash_password("password123"),
        full_name="Alice Admin",
        role=UserRole.ADMIN,
    )
    analyst = User(
        org_id=org.id,
        email="analyst@acme.com",
        password_hash=hash_password("password123"),
        full_name="Bob Analyst",
        role=UserRole.PRICING_ANALYST,
    )
    await admin.insert()
    await analyst.insert()
    print(f"Created users: {admin.email}, {analyst.email}")

    # ── Org config ────────────────────────────────────────────────────────────
    config = OrgConfig(
        org_id=org.id,
        escalation_email="admin@acme.com",
    )
    await config.insert()
    print("Created org config with default thresholds")

    # ── Products ──────────────────────────────────────────────────────────────
    products: list[Product] = []
    for idx, tmpl in enumerate(CATALOGUE):
        products.append(_make_product(tmpl, org.id, idx + 1))

    await Product.insert_many(products)
    print(f"Created {len(products)} products")

    # ── Competitor prices ─────────────────────────────────────────────────────
    comp_prices: list[CompetitorPrice] = []
    for product in products:
        comp_prices.extend(_make_competitor_prices(product, org.id))

    # Insert in batches of 500 to avoid oversized MongoDB writes
    batch_size = 500
    for i in range(0, len(comp_prices), batch_size):
        await CompetitorPrice.insert_many(comp_prices[i : i + batch_size])
    print(f"Created {len(comp_prices)} competitor price records")

    # ── Demand signals ────────────────────────────────────────────────────────
    demand_signals: list[DemandSignal] = []
    for product in products:
        demand_signals.extend(_make_demand_signals(product, org.id))

    for i in range(0, len(demand_signals), batch_size):
        await DemandSignal.insert_many(demand_signals[i : i + batch_size])
    print(f"Created {len(demand_signals)} demand signal records")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n✓ Seed complete!")
    print("  Login: admin@acme.com / password123  (admin)")
    print("  Login: analyst@acme.com / password123  (analyst)")
    print(f"  Products: {len(products)}")
    print(f"  Competitor prices: {len(comp_prices)}")
    print(f"  Demand signals: {len(demand_signals)}")


if __name__ == "__main__":
    asyncio.run(seed())
