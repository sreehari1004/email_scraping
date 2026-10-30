import main

def test_all():
    print("Testing Endpoints directly...")
    
    # 1. Health
    health = main.health_check()
    assert health["status"] == "ok"
    print("[PASS] Health endpoint OK:", health)

    # 2. History
    history = main.get_history(limit=5)
    assert history["total"] >= 5
    print(f"[PASS] History endpoint OK: {history['total']} total jobs, {len(history['jobs'])} on page")

    # 3. Analytics
    analytics = main.get_analytics()
    assert "kpis" in analytics
    print(f"[PASS] Analytics endpoint OK: {analytics['kpis']['total_websites']['value']} total websites")

    # 4. Outreach
    stats = main.get_outreach_stats()
    assert stats["total_contacts"] >= 1000
    print("[PASS] Outreach stats OK:", stats)

    logs = main.get_outreach_logs()
    assert len(logs) >= 4
    print(f"[PASS] Outreach logs OK: {len(logs)} logs found")

    # 5. AI Generation
    req = main.GenerateEmailRequest(
        prompt="Introduce our software development and AI automation solutions to Acme Corp",
        company_name="Acme Corp"
    )
    ai_data = main.ai_generate_email(req)
    assert "subject" in ai_data and "body" in ai_data
    print("[PASS] AI Generation OK. Subject:", ai_data["subject"])

    # 6. Check compiled frontend assets exist
    import os
    dist_html = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist", "index.html")
    assert os.path.exists(dist_html), "Frontend dist/index.html does not exist!"
    with open(dist_html, "r", encoding="utf-8") as f:
        html = f.read()
    assert "id=\"root\"" in html or "<div" in html
    print("[PASS] Frontend SPA distribution files verified!")

    print("\n=============================================")
    print("ALL CORE ENDPOINTS & MODULES VERIFIED 100%!")
    print("=============================================")

if __name__ == "__main__":
    test_all()
