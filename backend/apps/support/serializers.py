from rest_framework import serializers


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    subject = serializers.ChoiceField(choices=[
        ('soporte', 'Soporte técnico'),
        ('facturacion', 'Facturación'),
        ('sugerencias', 'Sugerencias'),
        ('otros', 'Otros'),
    ], default='soporte')
    message = serializers.CharField(min_length=10, max_length=4000)
    spam_trap = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Honeypot: if spam_trap has any content, reject silently
        if attrs.get('spam_trap'):
            raise serializers.ValidationError({'detail': 'Invalid submission'})
        return attrs
