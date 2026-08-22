from django.db import migrations, models


def populate_normalized(apps, schema_editor):
    Contact = apps.get_model("api", "Contact")
    seen = set()
    for contact in Contact.objects.order_by("id"):
        digits = "".join(ch for ch in contact.mobile if ch.isdigit())
        local = digits[-10:]
        normalized = f"91{local}" if len(local) == 10 else digits
        if normalized in seen:
            contact.delete()
            continue
        seen.add(normalized)
        contact.normalized_phone = normalized
        contact.mobile = local or digits
        contact.save(update_fields=["normalized_phone", "mobile"])


class Migration(migrations.Migration):
    dependencies = [("api", "0004_contactgroup_max_members")]
    operations = [
        migrations.AddField(
            model_name="contact",
            name="normalized_phone",
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.RunPython(populate_normalized, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="contact",
            name="normalized_phone",
            field=models.CharField(db_index=True, max_length=15, unique=True),
        ),
    ]
