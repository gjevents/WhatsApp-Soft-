import os
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import Campaign, CampaignRecipient, Contact, ContactGroup, FailedMessage, MediaAsset, WhatsAppSettings


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["id", "name", "mobile", "consent_status", "created_at"]


class CampaignSerializer(serializers.ModelSerializer):
    recipients = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "message",
            "delay_seconds",
            "status",
            "total_recipients",
            "sent_count",
            "failed_count",
            "pending_count",
            "created_at",
            "recipients",
            "media",
        ]

    def get_recipients(self, obj):
        return [
            {
                "id": recipient.id,
                "contact_id": recipient.contact_id,
                "name": recipient.contact.name,
                "phone": recipient.phone,
                "status": recipient.status,
                "attempts": recipient.attempts,
                "error_message": recipient.error_message,
            }
            for recipient in obj.recipients.select_related("contact").all()
        ]

    def get_media(self, obj):
        return MediaAssetSerializer(obj.media.all(), many=True).data


class ContactGroupSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source="contacts.count", read_only=True)

    class Meta:
        model = ContactGroup
        fields = ["id", "name", "max_members", "member_count", "contacts", "created_at"]


class CampaignRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRecipient
        fields = ["id", "campaign", "contact", "phone", "status", "attempts", "error_message", "last_attempt_at"]


class FailedMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FailedMessage
        fields = ["id", "campaign", "contact", "phone", "error", "attempts", "status", "created_at"]


class MediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaAsset
        fields = ["id", "file_name", "original_name", "file_type", "file_size", "storage_path", "created_at"]


class WhatsAppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSettings
        fields = ["id", "key", "value", "updated_at"]


class BulkContactUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
