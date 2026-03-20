import random

class CatchGame:
    def __init__(self):
        self.answer_key = {
            "card-set1-1.png": "answer_card_2.png",
            "card-set1-2.png": "answer_card_2.png",
            "card-set1-3.png": "answer_card_3.png",
            "card-set1-4.png": "answer_card_1.png",
            "card-set1-5.png": "answer_card_1.png",
            "card-set1-6.png": "answer_card_3.png",
            "card-set2-1.png": "answer_card_1.png",
            "card-set2-2.png": "answer_card_3.png",
            "card-set2-3.png": "answer_card_1.png",
            "card-set2-4.png": "answer_card_4.png",
            "card-set2-5.png": "answer_card_3.png",
            "card-set2-6.png": "answer_card_4.png",
            "card-set3-1.png": "answer_card_2.png",
            "card-set3-2.png": "answer_card_4.png",
            "card-set3-3.png": "answer_card_1.png",
            "card-set3-4.png": "answer_card_1.png",
            "card-set3-5.png": "answer_card_2.png",
            "card-set3-6.png": "answer_card_4.png",
            "card-set4-1.png": "answer_card_2.png",
            "card-set4-2.png": "answer_card_1.png",
            "card-set4-3.png": "answer_card_5.png",
            "card-set4-4.png": "answer_card_5.png",
            "card-set4-5.png": "answer_card_2.png",
            "card-set4-6.png": "answer_card_1.png",
            "card-set5-1.png": "answer_card_3.png",
            "card-set5-2.png": "answer_card_3.png",
            "card-set5-3.png": "answer_card_1.png",
            "card-set5-4.png": "answer_card_1.png",
            "card-set5-5.png": "answer_card_5.png",
            "card-set5-6.png": "answer_card_5.png",
            "card-set6-1.png": "answer_card_5.png",
            "card-set6-2.png": "answer_card_4.png",
            "card-set6-3.png": "answer_card_3.png",
            "card-set6-4.png": "answer_card_3.png",
            "card-set6-5.png": "answer_card_2.png",
            "card-set6-6.png": "answer_card_2.png",
            "card-set7-1.png": "answer_card_4.png",
            "card-set7-2.png": "answer_card_4.png",
            "card-set7-3.png": "answer_card_2.png",
            "card-set7-4.png": "answer_card_5.png",
            "card-set7-5.png": "answer_card_5.png",
            "card-set7-6.png": "answer_card_2.png",
            "card-set8-1.png": "answer_card_1.png",
            "card-set8-2.png": "answer_card_1.png",
            "card-set8-3.png": "answer_card_5.png",
            "card-set8-4.png": "answer_card_4.png",
            "card-set8-5.png": "answer_card_5.png",
            "card-set8-6.png": "answer_card_4.png",
        }
        self.question_pool = list(self.answer_key.keys())

    def generate_question(self, count=10):
        count = int(count or 0)
        if count <= 0:
            return []
        pool = list(self.question_pool)
        if not pool:
            return []
        if count >= len(pool):
            random.shuffle(pool)
            return pool
        return random.sample(pool, count)

    def check_answer(self, question_image, user_answer_image):
        correct_answer = self.answer_key.get(question_image)
        return bool(correct_answer) and correct_answer == user_answer_image
