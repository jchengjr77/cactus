#!/bin/bash

# Script to test push notification functions
# Usage: ./scripts/test-notifications.sh

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Cactus Push Notification Testing Script ===${NC}\n"

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}Error: SUPABASE_URL environment variable is not set${NC}"
    echo "Set it with: export SUPABASE_URL='https://your-project.supabase.co'"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set${NC}"
    echo "Set it with: export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    exit 1
fi

# Menu
echo "Select a test to run:"
echo "1. Test send-push-notification function"
echo "2. Test check-update-reminders function"
echo "3. View users with push tokens"
echo "4. View groups with update windows"
echo "5. View recent update_reminder notifications"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Testing send-push-notification function${NC}"
        read -p "Enter user ID to send test notification to: " user_id

        echo -e "${BLUE}Sending notification...${NC}"
        response=$(curl -s -X POST \
          "${SUPABASE_URL}/functions/v1/send-push-notification" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Content-Type: application/json" \
          -d "{
            \"user_ids\": [${user_id}],
            \"title\": \"Test Notification\",
            \"body\": \"This is a test push notification from the Cactus app\",
            \"data\": {
              \"type\": \"test\",
              \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }
          }")

        echo -e "${GREEN}Response:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    2)
        echo -e "\n${YELLOW}Testing check-update-reminders function${NC}"
        echo -e "${BLUE}Running reminder check...${NC}"

        response=$(curl -s -X POST \
          "${SUPABASE_URL}/functions/v1/check-update-reminders" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Content-Type: application/json")

        echo -e "${GREEN}Response:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    3)
        echo -e "\n${YELLOW}Fetching users with push tokens${NC}"

        response=$(curl -s -X POST \
          "${SUPABASE_URL}/rest/v1/rpc/get_users_with_tokens" \
          -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Content-Type: application/json" \
          -d '{}' 2>/dev/null)

        if [ $? -ne 0 ]; then
            # Fallback to direct query
            echo -e "${BLUE}Using direct query...${NC}"
            response=$(curl -s -G \
              "${SUPABASE_URL}/rest/v1/users" \
              -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
              -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
              --data-urlencode "select=id,name,email,push_token" \
              --data-urlencode "push_token=not.is.null")
        fi

        echo -e "${GREEN}Users with push tokens:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    4)
        echo -e "\n${YELLOW}Fetching groups with update windows${NC}"

        response=$(curl -s -G \
          "${SUPABASE_URL}/rest/v1/groups" \
          -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          --data-urlencode "select=id,name,emoji_icon,cadence_hrs,updates_due,is_active")

        echo -e "${GREEN}Groups:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    5)
        echo -e "\n${YELLOW}Fetching recent update_reminder notifications${NC}"

        response=$(curl -s -G \
          "${SUPABASE_URL}/rest/v1/notifications" \
          -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
          --data-urlencode "select=*" \
          --data-urlencode "notification_type=eq.update_reminder" \
          --data-urlencode "order=created_at.desc" \
          --data-urlencode "limit=10")

        echo -e "${GREEN}Recent update_reminder notifications:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Test complete!${NC}"
