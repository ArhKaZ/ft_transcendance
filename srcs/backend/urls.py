"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from . import views
from django.conf.urls.static import static
from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path

app_name = 'backend'

# urlpatterns = [
#     path('admin/', admin.site.urls),
# 	# path('', include('api.urls')),
#     path('onlinePong/', include('onlinePong.urls')),
# 	path('api/', include('api.urls')),
# 	path('user/', include('user.urls')),
# 	path('home/', views.main),
# 	path('logged/', views.logged, name='logged'),
# 	path('pixelPaws/', include('pixelPaws.urls')),
# 	path('onlinePong/logged_get_user/', views.logged_get_user, name='logged_get_user'),
# 	path('pixelPaws/logged_get_user/', views.logged_get_user, name='logged_get_user'),
# 	# path('dj-rest-auth/', include('dj_rest_auth.urls'))
# ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
from django.contrib import admin
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Add the catch-all route AFTER the static patterns
urlpatterns += [
    re_path(r'^.*', views.index),
]
  