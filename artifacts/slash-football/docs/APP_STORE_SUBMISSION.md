# App Store submission checklist (Apple + Google)

Use together with `APP_STORE_METADATA.md` and `REVIEW_NOTES_TEMPLATE.md`.

## Apple App Store
- [ ] Bundle id locked, signed with the production certificate.
- [ ] Version + build number bumped.
- [ ] App icon: 1024×1024 PNG, no transparency, no rounded corners baked in.
- [ ] Launch screen: matches in-app splash colour and crest.
- [ ] Screenshots: 6.7", 6.1", and 5.5" iPhone sizes; 12.9" iPad if available.
- [ ] App preview video (optional) ≤ 30 s, captures slash + match.
- [ ] App name + subtitle + promotional text within character limits.
- [ ] Keywords field uses 100 chars or fewer, comma-separated.
- [ ] Age rating questionnaire matches in-game content.
- [ ] App Privacy answers match the privacy policy.
- [ ] In-app purchases: declared as cosmetic / non-consumable as appropriate
      (deferred for v1).
- [ ] Encryption export compliance answered.
- [ ] Demo account / instructions filled in `REVIEW_NOTES_TEMPLATE.md`.

## Google Play
- [ ] Application id locked, signed with the production keystore (Play
      App Signing enrolled).
- [ ] Target SDK matches Play's current requirement.
- [ ] Adaptive icon supplied (foreground + background).
- [ ] Feature graphic 1024×500 supplied.
- [ ] Screenshots: phone (≥ 4) + 7" / 10" tablet sets.
- [ ] Short description (≤ 80 chars) and full description (≤ 4000 chars).
- [ ] Content rating questionnaire submitted.
- [ ] Data safety form filled and matches privacy policy.
- [ ] Ads declaration: "no" for v1.
- [ ] Target audience and content settings configured.
- [ ] Production release rollout plan (e.g. 5 % → 20 % → 50 % → 100 %).

## Cross-store
- [ ] Final app name consistent across both stores.
- [ ] Subtitle / short description aligned.
- [ ] Long description aligned.
- [ ] App categories chosen (Sports / Simulation primary).
- [ ] Tags / keywords reviewed.
- [ ] Support URL + privacy URL + terms URL all reachable.
- [ ] Age rating consistent (provisional: 4+ / Everyone).
