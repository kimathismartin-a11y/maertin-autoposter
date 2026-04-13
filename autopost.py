name: Wealth Insights Global Autoposter

on:
  schedule:
    - cron: "0 6 * * *"    # Run 0  — 09:00 EAT
    - cron: "24 8 * * *"   # Run 1  — 11:24 EAT
    - cron: "48 10 * * *"  # Run 2  — 13:48 EAT
    - cron: "12 13 * * *"  # Run 3  — 16:12 EAT
    - cron: "36 15 * * *"  # Run 4  — 18:36 EAT
    - cron: "0 18 * * *"   # Run 5  — 21:00 EAT
    - cron: "24 20 * * *"  # Run 6  — 23:24 EAT
    - cron: "48 22 * * *"  # Run 7  — 01:48 EAT
    - cron: "12 1 * * *"   # Run 8  — 04:12 EAT
    - cron: "36 3 * * *"   # Run 9  — 06:36 EAT
  workflow_dispatch:
    inputs:
      post_index:
        description: "Post index to use (0–29)"
        required: false
        default: "0"

jobs:
  autopost:
    runs-on: ubuntu-latest
    env:
      FB_ACCESS_TOKEN: ${{ secrets.FB_ACCESS_TOKEN }}
      FB_PAGE_ID: ${{ secrets.FB_PAGE_ID }}
      LI_ACCESS_TOKEN: ${{ secrets.LI_ACCESS_TOKEN }}
      LI_PERSON_URN: ${{ secrets.LI_PERSON_URN }}
      TW_API_KEY: ${{ secrets.TW_API_KEY }}
      TW_API_SECRET: ${{ secrets.TW_API_SECRET }}
      TW_ACCESS_TOKEN: ${{ secrets.TW_ACCESS_TOKEN }}
      TW_ACCESS_SECRET: ${{ secrets.TW_ACCESS_SECRET }}
      PEXELS_API_KEY: ${{ secrets.PEXELS_API_KEY }}

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install requests tweepy

      - name: Determine post index
        run: |
          HOUR=$(date +%H)
          MINUTE=$(date +%M)
          case "$HOUR:$MINUTE" in
            "06:00") INDEX=0 ;;
            "08:24") INDEX=1 ;;
            "10:48") INDEX=2 ;;
            "13:12") INDEX=3 ;;
            "15:36") INDEX=4 ;;
            "18:00") INDEX=5 ;;
            "20:24") INDEX=6 ;;
            "22:48") INDEX=7 ;;
            "01:12") INDEX=8 ;;
            "03:36") INDEX=9 ;;
            *) INDEX=${{ github.event.inputs.post_index || 0 }} ;;
          esac
          echo "POST_INDEX=$INDEX" >> $GITHUB_ENV
          echo "Using post index: $INDEX"

      - name: Run autoposter
        run: python autopost.py
