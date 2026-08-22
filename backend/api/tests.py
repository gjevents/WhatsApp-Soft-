from unittest.mock import patch

from django.test import TestCase

from .models import Campaign, CampaignRecipient, Contact, ContactGroup, FailedMessage


class CampaignSendViewTests(TestCase):
    def test_failed_recipient_creates_failed_message_record(self):
        contact = Contact.objects.create(name='Alice', mobile='9876543210', consent_status='OPTED_IN')
        campaign = Campaign.objects.create(name='Test campaign', message='Hello', delay_seconds=1)
        recipient = CampaignRecipient.objects.create(
            campaign=campaign,
            contact=contact,
            phone=contact.mobile,
            status='PENDING',
            attempts=0,
        )

        with patch('api.views.requests.post', side_effect=RuntimeError('service unavailable')):
            campaign_view = __import__('api.views', fromlist=['CampaignSendView']).CampaignSendView()
            campaign_view._send_messages_thread(campaign)

        recipient.refresh_from_db()
        self.assertEqual(recipient.status, 'PENDING')
        self.assertEqual(recipient.attempts, 1)
        self.assertEqual(FailedMessage.objects.filter(campaign=campaign, contact=contact).count(), 1)
        self.assertIn('service unavailable', FailedMessage.objects.filter(campaign=campaign, contact=contact).latest('created_at').error)


class ContactGroupViewTests(TestCase):
    def test_group_limit_is_saved_and_enforced(self):
        contacts = [
            Contact.objects.create(name=f"Contact {index}", mobile=f"98765432{index:02d}", consent_status="OPTED_IN")
            for index in range(3)
        ]

        response = self.client.post(
            "/api/groups",
            {"name": "Small", "max_members": 2, "contact_ids": [contact.id for contact in contacts]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("up to 2", response.json()["error"])

        response = self.client.post(
            "/api/groups",
            {"name": "Small", "max_members": 2, "contact_ids": [contacts[0].id, contacts[1].id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["max_members"], 2)

    def test_contacts_are_not_limited_by_workspace_setting(self):
        for index in range(61):
            Contact.objects.create(name=f"Contact {index}", mobile=f"987650{index:04d}")

        response = self.client.post(
            "/api/contacts",
            {"name": "Contact 61", "mobile": "9876500061"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

    def test_duplicate_group_name_returns_bad_request(self):
        ContactGroup.objects.create(name="Guests")

        response = self.client.post(
            "/api/groups",
            {"name": " guests ", "max_members": 60, "contact_ids": []},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "A group with this name already exists.")

    def test_contact_cannot_be_added_to_two_groups(self):
        contact = Contact.objects.create(name="Alice", mobile="9876543210", consent_status="OPTED_IN")
        ContactGroup.objects.create(name="First").contacts.add(contact)

        response = self.client.post(
            "/api/groups",
            {"name": "Second", "contact_ids": [contact.id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already in another group", response.json()["error"])

    def test_contact_can_be_added_to_existing_group(self):
        first = Contact.objects.create(name="Alice", mobile="9876543210", consent_status="OPTED_IN")
        second = Contact.objects.create(name="Bob", mobile="9876543211", consent_status="OPTED_IN")
        group = ContactGroup.objects.create(name="Guests", max_members=60)
        group.contacts.add(first)

        response = self.client.put(
            f"/api/groups/{group.id}",
            {"name": group.name, "max_members": group.max_members, "contact_ids": [first.id, second.id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["member_count"], 2)
