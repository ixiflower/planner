from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from .models import ConfigFile
import os

class FileUploadTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.admin_user = User.objects.create_user(
            username='adminuser',
            password='adminpass123',
            is_staff=True
        )

    def test_file_upload_by_regular_user(self):
        """
        Test that a regular user can upload a .txt file
        """
        # Login as regular user
        self.client.login(username='testuser', password='testpass123')
        
        # Create a test file
        test_file = SimpleUploadedFile(
            "test_file.txt",
            b"This is a test file content.",
            content_type="text/plain"
        )
        
        # Post the file
        response = self.client.post(reverse('upload_file'), {
            'file': test_file
        })
        
        # Check that the file was uploaded successfully
        self.assertEqual(response.status_code, 302)  # Redirect after success
        
        # Check that the file was saved in the database
        config_files = ConfigFile.objects.filter(uploaded_by=self.user)
        self.assertEqual(config_files.count(), 1)
        
        # Check file properties
        config_file = config_files.first()
        self.assertEqual(config_file.name, "test_file.txt")
        self.assertEqual(config_file.uploaded_by, self.user)
        
        # Clean up the uploaded file
        if config_file.file and os.path.isfile(config_file.file.path):
            os.remove(config_file.file.path)

    def test_non_txt_file_upload_rejection(self):
        """
        Test that non-.txt files are rejected
        """
        # Login as regular user
        self.client.login(username='testuser', password='testpass123')
        
        # Create a test file with wrong extension
        test_file = SimpleUploadedFile(
            "test_file.pdf",
            b"This is a test file content.",
            content_type="application/pdf"
        )
        
        # Post the file
        response = self.client.post(reverse('upload_file'), {
            'file': test_file
        })
        
        # Check that the file was not uploaded
        self.assertEqual(response.status_code, 302)  # Redirect after failure
        
        # Check that no file was saved in the database
        config_files = ConfigFile.objects.filter(uploaded_by=self.user)
        self.assertEqual(config_files.count(), 0)

    def test_file_upload_by_anonymous_user(self):
        """
        Test that anonymous users cannot upload files
        """
        # Create a test file
        test_file = SimpleUploadedFile(
            "test_file.txt",
            b"This is a test file content.",
            content_type="text/plain"
        )
        
        # Try to post the file without logging in
        response = self.client.post(reverse('upload_file'), {
            'file': test_file
        })
        
        # Check that the user is redirected to login
        self.assertEqual(response.status_code, 302)
        self.assertIn('/tickets/login/', response.url)
        
        # Check that no file was saved in the database
        config_files = ConfigFile.objects.all()
        self.assertEqual(config_files.count(), 0)