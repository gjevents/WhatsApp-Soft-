from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContactGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255, unique=True)),
                ("max_members", models.IntegerField(default=60)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
        migrations.AddField(
            model_name="campaign",
            name="media",
            field=models.ManyToManyField(blank=True, related_name="campaigns", to="api.mediaasset"),
        ),
        migrations.AddField(
            model_name="contactgroup",
            name="contacts",
            field=models.ManyToManyField(blank=True, related_name="groups", to="api.contact"),
        ),
    ]
