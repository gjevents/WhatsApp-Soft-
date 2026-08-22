from django.db import models
from django.utils import timezone


CONSENT_CHOICES = [
    ("OPTED_IN", "Opted In"),
    ("PENDING", "Pending"),
    ("OPTED_OUT", "Opted Out"),
]


class Contact(models.Model):
    name = models.CharField(max_length=255)
    mobile = models.CharField(max_length=30, unique=True)
    normalized_phone = models.CharField(max_length=15, unique=True, db_index=True)
    consent_status = models.CharField(max_length=20, choices=CONSENT_CHOICES, default="PENDING")
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.normalized_phone:
            digits = "".join(ch for ch in str(self.mobile) if ch.isdigit())
            local = digits[-10:]
            if len(local) == 10:
                self.mobile = local
                self.normalized_phone = f"91{local}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.mobile})"


class ContactGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    max_members = models.PositiveIntegerField(default=60)
    contacts = models.ManyToManyField(Contact, related_name="groups", blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Campaign(models.Model):
    name = models.CharField(max_length=255)
    message = models.TextField()
    delay_seconds = models.IntegerField(default=5)
    status = models.CharField(max_length=30, default="DRAFT")
    total_recipients = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    pending_count = models.IntegerField(default=0)
    media = models.ManyToManyField("MediaAsset", related_name="campaigns", blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class CampaignRecipient(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="recipients")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    phone = models.CharField(max_length=30)
    status = models.CharField(max_length=30, default="PENDING")
    attempts = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    last_attempt_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("campaign", "contact")

    def __str__(self):
        return f"{self.contact.name} - {self.status}"


class MediaAsset(models.Model):
    file_name = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.IntegerField(default=0)
    storage_path = models.CharField(max_length=500)
    created_at = models.DateTimeField(default=timezone.now)


class WhatsAppSettings(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500, blank=True, null=True)
    updated_at = models.DateTimeField(default=timezone.now)


class FailedMessage(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="failed_messages")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    phone = models.CharField(max_length=30)
    error = models.TextField()
    attempts = models.IntegerField(default=0)
    status = models.CharField(max_length=30, default="FAILED")
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.contact.name} failed: {self.error}"
