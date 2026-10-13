"""Words that mean real food.

Not a dictionary: a floor. A list that contains any of these is cookable, so
the engine never passes on a model's `rejection` for it. A food that is missing
here is still cooked whenever the model cooks it, which is nearly always; only
the refusal goes unchecked. Words that are as likely to be an object as a food
("apple", "chip", "mouse") are left out on purpose.
"""

import re

KNOWN_FOODS = frozenset(
    [
        "anchovy",
        "asparagus",
        "aubergine",
        "avocado",
        "bacon",
        "bagel",
        "banana",
        "barley",
        "basil",
        "bean",
        "beef",
        "beetroot",
        "berry",
        "biscuit",
        "bread",
        "broccoli",
        "butter",
        "cabbage",
        "carrot",
        "cauliflower",
        "celery",
        "cheddar",
        "cheese",
        "chicken",
        "chickpea",
        "chilli",
        "chocolate",
        "chorizo",
        "coconut",
        "cod",
        "coriander",
        "courgette",
        "couscous",
        "cream",
        "cucumber",
        "curry",
        "egg",
        "feta",
        "fish",
        "flour",
        "garlic",
        "ginger",
        "ham",
        "halloumi",
        "herb",
        "honey",
        "hummus",
        "kale",
        "lamb",
        "leek",
        "lemon",
        "lentil",
        "lettuce",
        "lime",
        "maggi",
        "mango",
        "mayo",
        "mayonnaise",
        "meat",
        "milk",
        "mince",
        "mozzarella",
        "mushroom",
        "mustard",
        "noodle",
        "oat",
        "olive",
        "onion",
        "orange",
        "paneer",
        "parmesan",
        "parsley",
        "pasta",
        "pea",
        "peanut",
        "pepper",
        "pesto",
        "pork",
        "potato",
        "prawn",
        "quinoa",
        "ramen",
        "rice",
        "salmon",
        "salsa",
        "sardine",
        "sausage",
        "soy",
        "spaghetti",
        "spam",
        "spinach",
        "squash",
        "steak",
        "stock",
        "sweetcorn",
        "tofu",
        "tomato",
        "tortilla",
        "tuna",
        "turkey",
        "veg",
        "vegetable",
        "yoghurt",
        "yogurt",
    ]
)


def _singulars(word: str) -> set[str]:
    out = {word}
    if word.endswith("ies"):
        out.add(word[:-3] + "y")
    if word.endswith("es"):
        out.add(word[:-2])
    if word.endswith("s"):
        out.add(word[:-1])
    return out


def has_known_food(ingredients: list[str]) -> bool:
    return any(
        _singulars(word) & KNOWN_FOODS
        for name in ingredients
        for word in re.findall(r"[a-z]+", name.lower())
    )
