from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_contactgroup_campaign_media"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="contactgroup",
            name="max_members",
        ),
    ]