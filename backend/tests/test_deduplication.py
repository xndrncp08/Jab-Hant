from app.services import deduplication


def test_normalize_title_strips_noise_words_and_sorts_tokens():
    a = deduplication.normalize_title("Junior Software Developer")
    b = deduplication.normalize_title("Junior Software Developer - Calgary")
    c = deduplication.normalize_title("Software Developer, Junior")
    assert a == b == c


def test_normalize_title_does_not_merge_different_seniority():
    junior = deduplication.normalize_title("Junior Software Developer")
    senior = deduplication.normalize_title("Senior Software Developer")
    assert junior != senior


def test_token_overlap_similar_titles_score_high():
    a = deduplication.normalize_title("Full Stack Developer")
    b = deduplication.normalize_title("Full Stack Developer - Remote")
    sim = deduplication._token_overlap(a, b)
    assert sim >= deduplication.TITLE_SIMILARITY_THRESHOLD


def test_token_overlap_different_roles_score_low():
    a = deduplication.normalize_title("Frontend Developer")
    b = deduplication.normalize_title("Backend Developer")
    sim = deduplication._token_overlap(a, b)
    assert sim < deduplication.TITLE_SIMILARITY_THRESHOLD
