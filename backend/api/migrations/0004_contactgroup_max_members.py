from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_remove_contactgroup_max_members"),
    ]

    operations = [
        migrations.AddField(
            model_name="contactgroup",
            name="max_members",
            field=models.PositiveIntegerField(default=60),
        ),
    ]